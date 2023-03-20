import * as AWS from 'aws-sdk';
import { Buffer } from 'buffer';
import { Context, APIGatewayEvent, APIGatewayProxyResult, } from 'aws-lambda';

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
async function invokeSage(beats: number[][]) {

  const data = []
  for (const beat of beats) {
    const formattedBeat = formatArr(beat.slice(0, 186))
    data.push(formattedBeat)
  }

  const params = {
    Body: JSON.stringify(data),
    EndpointName: 'pleasework4',
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
 * Segments the ECG values into individual beats
 * 
 * @param nums ECG values 
 * @param mindist minimum distance between peaks
 * @param threshpct threshold to be a peak
 * @returns array of beats
 */
function segmentHeartbeat(nums: number[], mindist: number, threshpct = 0.7) {
  let globalmax = Math.max(...nums);

  // find peaks in nums that are above thereshold
  let maxinds = [];
  for (let i = 1; i < nums.length - 1; i++) {
    // check for local max
    if (nums[i] > nums[i - 1] && nums[i] > nums[i + 1]) {
      // check if above threshold
      if (nums[i] > globalmax * threshpct) {
        maxinds.push(i);
      }
    }
  }

  if (maxinds.length > 0) {
    // sort localmaxinds by size
    maxinds.sort((a, b) => nums[b] - nums[a]);

    // remove peaks that are too close
    for (let i = 0; i < maxinds.length; i++) {
      let peakind = maxinds[i];
      // remove peaks that are too close
      for (let j = i + 1; j < maxinds.length; j++) {
        if (Math.abs(maxinds[j] - peakind) < mindist) {
          maxinds.splice(j, 1);
          j--;
        }
      }
    }

    maxinds.sort((a, b) => a - b);
  }
  else {
    // no peaks found
    throw new Error("No peaks found");
  }

  // segment based on beats

  const beats:number[][] = [];
  const starts:number[] = [];
  for (let i = 1; i < maxinds.length - 1; i++) {
    const diff = maxinds[i + 1] - maxinds[i - 1];
    const start = Math.round(maxinds[i] - diff / 4);
    const end = Math.round(maxinds[i] + diff / 4);
    starts.push(start)
    beats.push(subSample(nums.slice(start, end), 186));
  }

  return {
    beats: beats,
    starts: starts
  };
}

/**
 * Simple array sub-sampling
 * @param arr input array
 * @param newSize desired size of the new array
 * @returns 
 */
function subSample(arr: number[], newSize: number): number[] {
  console.log(arr.length)
  const newArr = [];
  const sizeRatio = arr.length / newSize;
  for (let i = 0; i < newSize; i++) {
    newArr.push(arr[Math.round(i * sizeRatio)]);
  }
  return newArr
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
  const predRes = invokeSage(heartbeats.beats);

  return Promise.all([emailRes, audRes, ecgRes, predRes]).then(results => {
    const screenResults = results[3];

    const metadata = {
      patientID: body.patientID,
      startTime: body.startTime,
      destEmail: body.destEmail,
      sampleRate: body.sampleRate,
      stethoscopeLocation: body.stethoscopeLocation,
      screenResults: screenResults,
      beatLocations: heartbeats.starts
    };

    return s3.putObject({
      Bucket: "heartmonitor-audiotest",
      Key: `${pathPrefix}META.json`,
      Body: JSON.stringify(metadata),
      ContentType: "binary/octet-stream"
    }).promise().then(() => {
      return {
        statusCode: 200,
        headers: {
        },
        body: JSON.stringify(screenResults)
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
