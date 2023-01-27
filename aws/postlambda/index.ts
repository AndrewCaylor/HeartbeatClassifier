import * as AWS from 'aws-sdk';
import { Buffer } from 'buffer';
import { Context, APIGatewayEvent, APIGatewayProxyResult, } from 'aws-lambda';

AWS.config.update({ region: 'us-east-1' });
const s3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'us-east-1' });
const ses = new AWS.SES({ apiVersion: '2010-12-01' });
const lambda = new AWS.Lambda({region: 'us-east-1'});
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

interface PostParams {
  audio: string;
  ecg: string;
  patientID: string;
  destEmail: string;
  startTime: number;
  password: string;
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
  for (const beat of beats){
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
  const emailRes = ses.sendEmail(sesParams).promise();

  const audRes = s3.putObject({
    Bucket: "heartmonitor-audiotest",
    Key: `${body.patientID}${body.startTime}AUDIO.wav`,
    Body: audioBuf,
    ContentType: "audio/x-wav"
  }).promise();

  const ecgRes = s3.putObject({
    Bucket: "heartmonitor-audiotest",
    Key: `${body.patientID}${body.startTime}ECG.csv`,
    Body: ecgCsv,
    ContentType: "text/csv"
  }).promise();

  const metadata = {
    patientID: body.patientID,
    startTime: body.startTime,
    destEmail: body.destEmail,
  };

  const metaRes = s3.putObject({
    Bucket: "heartmonitor-audiotest",
    Key: `${body.patientID}${body.startTime}META.json`,
    Body: JSON.stringify(metadata),
    ContentType: "binary/octet-stream"
  }).promise();

  const ecgArr = Array.prototype.slice.call(ecgFloat32) as number[];
  const predRes = invokeSage(segmentHeartbeat(ecgArr));


  // wait for all promises to resolve
  const results = await Promise.all([emailRes, audRes, ecgRes, metaRes, predRes]);

  const response = {
    statusCode: 200,
    headers: {
    },
    body: JSON.stringify(results[4])
  };
  return response;
};

function segmentHeartbeat(beatsArr: number[]){
  return [beatsArr];
}