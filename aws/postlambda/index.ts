import * as AWS from 'aws-sdk';
import { Buffer } from 'buffer';
import { Context, APIGatewayEvent, APIGatewayProxyResult, } from 'aws-lambda';
import segmentHeartbeat from './peakseg';

AWS.config.update({ region: 'us-east-1' });
const s3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'us-east-1' });
const ses = new AWS.SES({ apiVersion: '2010-12-01' });
const lambda = new AWS.Lambda({ region: 'us-east-1' });
const sage = new AWS.SageMakerRuntime();

function getEmailParams(destEmail: string, patientID: string, startTime: string) {
  const accessLink = createAccessLink(patientID, startTime);
  const emailParams = {
    Destination: { /* required */
      CcAddresses: [],
      ToAddresses: [
        destEmail,
      ]
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `Access Link: ${accessLink}`
        },
        Text: {
          Charset: "UTF-8",
          Data: "TEXT_FORMAT_BODY"
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `New Heartbeat Recording for patientID: ${patientID}!`
      }
    },
    Source: 'andrewc01@vt.edu',
  };
  return emailParams;
}

function createAccessLink(patientID: string, startTime: string) {
  const baseURL = "https://75xtipvj56.execute-api.us-east-1.amazonaws.com";
  return `${baseURL}/index.html?patientID=${patientID}&startTime=${startTime}&password=gokies`;
}

enum AuscultationPt {
  aortic = "aortic",
  mitral = "mitral",
  tricuspid = "tricuspid",
  pulmonic = "pulmonic",
}

enum SageMakerEndpoint {
  STChange = "STChange-final",
  ConductionDisturbance = "ConductionDisturbance-final",
  Hypertrophy = "Hypertrophy-final",
  MyocardialInfarction = "MyocardialInfarction-final",
}

interface PostParams {
  audio: string;
  ecg: string;
  patientID: string;
  destEmail: string;
  startTime: number;
  password: string;
  sampleRate: number;
  stethoscopeLocation: AuscultationPt;
  sendEmail: boolean;
}

interface ResultsRes {
  ST: number[];
  CD: number[];
  H: number[];
  MI: number[];
}

/**
 * 
 * @param arr array of numbers: 1 row, n col
 * @returns n rows, 1 col
 */
function formatArr(arr: number[]) {
  const newArr = []
  for (let i = 0; i < arr.length; i++) {
    newArr.push([arr[i]])
  }
  return newArr
}

/**
 * 
 * @param beats array of beats. Each beat is an array of numbers
 * @returns JSON object of the response from SageMaker instance
 */
async function invokeSage(beats: number[][], endpoint: SageMakerEndpoint) {

  const data = []
  for (const beat of beats) {
    const formattedBeat = formatArr(beat)
    data.push(formattedBeat)
  }

  const params = {
    Body: JSON.stringify(data),
    EndpointName: endpoint,
    ContentType: 'application/json',
    Accept: 'application/json',
  }

  console.log("Invoking SageMaker endpoint")

  return sage.invokeEndpoint(params).promise().then(data => {
    return JSON.parse(data.Body.toString());
  });
}

function buffToFloat32(buff: Buffer) {
  // reads each of the 4 byte floats from the buffer
  const float32 = new Float32Array(buff.byteLength / 4);
  for (let i = 0; i < float32.length; i++) {
    float32[i] = buff.readFloatLE(i * 4);
  }
  return float32;
}


/**
 * @param sageRes array of 4 predictions results from SageMaker
 * @returns cleaned up results
 */
function formatSage(sageRes: { predictions: number[][] }[]): ResultsRes {
  const results = [[],[],[],[]];

  for (let i = 0; i < 4; i++) {
    results[i] = [];
    for(let j = 0; j < sageRes[i].predictions.length; j++) {
      results[i].push(sageRes[i].predictions[j][0]);
    }
  }

  return {
    ST: results[0],
    CD: results[1],
    H: results[2],
    MI: results[3],
  }
}

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const bodyBuff = Buffer.from(event.body, 'base64');
  const bodyStr = bodyBuff.toString('utf8');
  const body = JSON.parse(bodyStr) as PostParams;
  const audioBuf = Buffer.from(body.audio, 'base64');
  const ecgBuf = Buffer.from(body.ecg, 'base64');

  const ecgFloat32 = buffToFloat32(ecgBuf);
  // join the floats into a string
  const ecgCsv = ecgFloat32.join('\n');

  const sesParams = getEmailParams(body.destEmail, body.patientID, body.startTime.toString());
  const emailRes = body.sendEmail ? ses.sendEmail(sesParams).promise() : Promise.resolve();

  const pathPrefix = `${body.patientID}${body.startTime}${body.stethoscopeLocation}`;

  const audRes = s3.putObject({
    Bucket: "heartmonitor-audiotest",
    Key: `${pathPrefix}AUDIO.wav`,
    Body: audioBuf,
    ContentType: "audio/x-wav"
  }).promise();

  const ecgRes = s3.putObject({
    Bucket: "heartmonitor-audiotest",
    Key: `${pathPrefix}ECG.csv`,
    Body: ecgCsv,
    ContentType: "text/csv"
  }).promise();


  const ecgArr = Array.prototype.slice.call(ecgFloat32) as number[];

  // calculate the minimum distance between heartbeats
  // 250BPM = 4.16Hz
  const minDist = Math.round(body.sampleRate / 4.16);
  const heartbeats = segmentHeartbeat(ecgArr, minDist, .7);

  const beatsFound = heartbeats.beats.length > 0;
  console.log(heartbeats, beatsFound)

  // only invoke SageMaker if there are heartbeats
  let predRes = new Promise((resolve, reject) => {
    resolve([]);
  });

  // invoke the SageMaker endpoint for each condition
  if (beatsFound) {
    predRes = Promise.all([
      invokeSage(heartbeats.beats, SageMakerEndpoint.STChange),
      invokeSage(heartbeats.beats, SageMakerEndpoint.ConductionDisturbance),
      invokeSage(heartbeats.beats, SageMakerEndpoint.Hypertrophy),
      invokeSage(heartbeats.beats, SageMakerEndpoint.MyocardialInfarction),
    ])
  }

  return Promise.all([emailRes, audRes, ecgRes, predRes]).then(results => {
    let screenResults = beatsFound ? formatSage(results[3] as { predictions: number[][] }[]) : [] ;

    const metadata = {
      patientID: body.patientID,
      startTime: body.startTime,
      destEmail: body.destEmail,
      sampleRate: body.sampleRate,
      stethoscopeLocation: body.stethoscopeLocation,
      screenResults: screenResults,
      beatLocations: heartbeats.ends
    };

    return s3.putObject({
      Bucket: "heartmonitor-audiotest",
      Key: `${pathPrefix}META.json`,
      Body: JSON.stringify(metadata),
      ContentType: "binary/octet-stream"
    }).promise().then(() => {
      if (beatsFound) {
        return {
          statusCode: 200,
          headers: {
          },
          body: JSON.stringify(screenResults)
        }
      }
      else {
        return {
          statusCode: 400,
          headers: {
          },
          body: JSON.stringify("No heartbeats found")
        }
      }

    });

  }).catch(err => {
    return {
      statusCode: 500,
      headers: {
      },
      body: JSON.stringify(err)
    }
  });
};
