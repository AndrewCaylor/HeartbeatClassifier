import * as AWS from 'aws-sdk';
import { Context, APIGatewayProxyEvent, APIGatewayProxyResult,  } from 'aws-lambda';

AWS.config.update({ region: 'us-east-1' });
const s3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'us-east-1' });


const badParamsErr = {
  statusCode: 400,
  headers: {
  },
  body: JSON.stringify({ error: "Missing/bad parameters" })
}

function getContentType(path: string) {
  const ext = path.split('.').pop() || '';
  switch (ext) {
    case 'wav':
      return 'audio/x-wav';
    case 'mp3':
      return 'audio/mpeg';
    case 'html':
      return 'text/html';
    case 'css':
      return 'text/css';
    case 'js':
      return 'text/javascript';
    case 'json':
      return 'application/json';
    case 'png':
      return 'image/png';
    case 'jpg':
      return 'image/jpeg';
    default:
      return 'text/plain';
  }
}

interface Params {
  patientID: string;
  startTime: string;
  password: string;
  dataType: "audio" | "ecg" | undefined;
}
export const handler = async (event, context): Promise<APIGatewayProxyResult> => {

  if (event.rawPath === undefined) {
    return badParamsErr;
  }

  let key;
  let bucket;

  // if no query params, return the index.html file
  if (event.queryStringParameters === undefined) {
    key = event.rawPath.substring(1).split("?")[0];
    bucket = "heartmonitorweb";
  }
  else {
    const params = event.queryStringParameters as Params;
    const { patientID, startTime, password, dataType } = params;

    if (!patientID || !startTime || password !== "gokies") {
      return badParamsErr;
    }

    switch (dataType) {
      case "audio":
        key = `${patientID}${startTime}AUDIO.wav`;
        bucket = "heartmonitor-audiotest";
        break;
      case "ecg":
        key = `${patientID}${startTime}ECG.csv`;
        bucket = "heartmonitor-audiotest";
        break;
      default:
        key = event.rawPath.substring(1).split("?")[0];
        bucket = "heartmonitorweb";
        break;
    }
  }

  const res = (await s3.getObject({
    Bucket: bucket,
    Key: key,
  }).promise()).Body;

  const contentType = getContentType(key);
  const isWeb = bucket === "heartmonitorweb";

  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    },
    body: isWeb ? res.toString('utf-8') : res.toString('base64'),
    isBase64Encoded: !isWeb,
  };
  return response;
};
