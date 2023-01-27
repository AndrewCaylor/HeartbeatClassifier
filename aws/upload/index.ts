import { Axios } from 'axios';
import * as fs from 'fs';

import * as AWS from 'aws-sdk';
import { Buffer } from 'buffer';

AWS.config.update({ region: 'us-east-1' });

const sage = new AWS.SageMakerRuntime();

interface PostParams {
  audio: string;
  ecg: string;
  patientID: string;
  startTime: number;
  destEmail: string;
  password: string;
}

/**
 * @param CSV CSV file with foating point numbers
 * @returns Float32 Buffer
 */
function CSVFiletoFloat32Buffer(CSV: Buffer) {
  // get the string from the file buffer
  const decoder = new TextDecoder();
  const str = decoder.decode(CSV);

  // convert the string to a series of numbers
  const ecgNums = str.split('\n').map(Number);

  // create a float32 buffer
  const float32 = new Float32Array(ecgNums);
  const float32Buffer = Buffer.from(float32.buffer);

  return float32Buffer;
}

/**
 * Uploads the ECG and audio files to the server
 * The server will then process the data and send an email 
 * with the access link to the results to destEmail
 * 
 * @param audioData WAV audio Buffer
 * @param ecgData Float32 Buffer
 * @param patientID This can be any string
 * @param email Email to send access link to
 * @param apiKey Must be gokies, this is temporary security
 * @returns Response from API
 */
async function upload(audioData: Buffer,
  ecgData: Buffer,
  patientID: string,
  email: string,
  apiKey: string) {
  
  // Get an object to send a HTTPS POST request to the server
  const axios = new Axios({
    baseURL: 'https://75xtipvj56.execute-api.us-east-1.amazonaws.com',
  });

  // create a JSON object with all of the parameters
  // audio and ecg are base64 encoded, so they can be sent as strings
  const uploadParams: PostParams = {
    audio: audioData.toString('base64'),
    ecg: ecgData.toString('base64'),
    patientID: patientID, 
    destEmail: email,
    startTime: Date.now(),
    password: apiKey,
  }

  // the JSON object is sent as the body of the POST request, which is a string
  const response = await axios.post("/upload", JSON.stringify(uploadParams), {});
  return response;
}

async function DoUploadDemo() {

  // read the metronome file, then read the ecg file
  const audioFile = await fs.readFileSync('./metronome80.wav');
  const ecgFile = await fs.readFileSync('./../../ml/dataset/archive/mitbih_test.csv');

  // get first line of ecgFile
  const lines = ecgFile.toString().split('\n')
  const line = lines[99].split(',').map(Number)
  line.pop()
  line.pop()

  console.log(line.length)

  const float32 = new Float32Array(line);
  const float32Buffer = Buffer.from(float32.buffer);

  // const float32ECGBuffer = CSVFiletoFloat32Buffer(ecgFile);

  return upload(audioFile, float32Buffer, 'drew', 'andrewc01@vt.edu', 'gokies');
}

const start = Date.now();

DoUploadDemo().then((res) => {
  console.log(res);

  const end = Date.now();
  console.log(`Time: ${end - start} ms`);
});

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

async function invokeSageDemo(){
  const ecgFile = await fs.readFileSync('./../../ml/dataset/archive/mitbih_test.csv');

  // get first line of ecgFile
  const lines = ecgFile.toString().split('\n')

  const beats = []
  for (let i = 0; i < 10; i++) {
    // splits into the numbers
    const line = lines[i].split(',').map(Number)
    beats.push(line)
  }

  return invokeSage(beats)
}

// const start = Date.now()
// invokeSageDemo().then((data)=>{
//   console.log(data)

//   const end = Date.now();
//   console.log(`Time: ${end - start} ms`);
// }).catch((err) => {
//   console.log(err);
// });