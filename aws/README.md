# Heartbeat Collection & Classification System - AWS
We used AWS to host the cloud architecture for this project for a variety of reasons:    
1. Huge suite of services that meets all of our needs
2. Reasonable pricing / free tier
3. Wide adoption among the devloper community -> extensive StackOverflow posts
4. But most importantly: AWS pays me!!!

## Heartbeat Processor - POST Lambda
This Heartbeat Processor performs the following actions:
1. Receive Stethoscope and ECG recordings
2. Save the recordings in the cloud
3. Send a website access link to the Cardiologist email address
4. Segment the ECG recording into distinct heartbeats
5. Screen each of the heartbeats for possible heart conditions
6. Return screening results to the client

I chose to implement this using the Typescript / node.js environment due to how well Javscript handles asyncronous API calls. In the future, if any more signal processing is required, it might be better to switch to a Python backend.

### API reference

**Request** Parameters:
- Stethoscope Recording: Base 64 encoded wav buffer
- ECG Recording: Base 64 encoded float32[] buffer
- Cardiologist Email: can only be andrewc01@vt.edu because AWS SES is in test mode
- Patient ID: string
- Recording Start Time: int
- API Key: for now, this is just "gokies"
- Sample Rate: Sample rate of the ECG recording in Hz
- Stethoscope Location: “aortic”, “mitrial”, “tricuspid”, “pulmonic”
- Send Email: boolean

If any of the parameters of the request packet are invalid or missing, the Lambda instance will respond with HTTP 400. 

```json
{
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
```

**Response** Parameters:    
The response contains the estimated likelihoods that each heartbeat indicates the given heart condition, for all heart conditions. 
- ST Change: number[]
- Conduction Disturbance: number[]
- Hypertrophy: number[]
- Myocardial Infarction: number[]

```json
{
  ST: number[];
  CD: number[];
  H: number[];
  MI: number[];
}
```

### More Info

Before processing any files, the server checks that the API Key is valid. This is to ensure only authorized client devices are able to make requests. In the future, we need to create a method for creating, distributing, and verifying API keys. Currently, I just check if `body.password == "gokies"` to verify the API key.

Once the API key is verified, multiple actions happen concurrently: 
1. Stethoscope and ECG recordings are decoded back into Buffers, then saved in an S3 Bucket.

The directory these files are saved in is determined by the PatientID and Recording Start Time. This will create a unique location to find the recordings at a later time. 

2. An email with a website access link is sent to the Cardiologist email using AWS SES. 

The access link must include the following parameters in the query string: Patient ID, Recording Start Time, Stethoscope Location, and API Key. The first three parameters identify the specific recording so that the website can download the files. The API Key is included to ensure that only the Cardiologist is able to view private patient data. 

3. ECG signal processing and ML Model interpretation

The ECG recording is split into distinct heartbeats and resampled. The sample rate of the recording is used in the segmentation process. The code for this process is in /postlambda/peakseg.ts. Then, each heartbeat is processed using 4 different CNNs. Each CNN specifically trained to detect a particular heart condition. This processing occurs on four independent  AWS Sagemaker endpoints, one for each CNN. Each of the endpoints are sent the segmented heartbeats and the heartbeats are processed concurrently by the CNNs. 

Once all API requests conclude, then the request metadata is stored. Metadata includes: Patient ID, Recording Start Time, Cardiologist Email, Sample Rate, Stethoscope Location, Model Interpretatio, and the time range of each of the heartbeats. 

Finally, the probabilities of each heartbeat indicating each of the four heart conditions are returned to the client device.

## Web Server - GET Lambda
The GET Lambda operates as a web server.    
The Web Server will perform the following steps:
1. Receive a request for a file
2. Download the file from cloud storage
3. Return the contents of the file to the client

### API Reference

Query String Parameters:
- Patient ID: string
- Recording Start Time: string
- Stethoscope Location: “aortic”, “mitrial”, “tricuspid”, “pulmonic”
- API Key: string
- File Type: Stethoscope / ECG / Metadata / Undefined ("audio", "ecg", "meta", undefined)
- Path: Path to HTML/CSS/js file if File Type is undefined

Full API:
```
GET https://75xtipvj56.execute-api.us-east-1.amazonaws.com/{PATH}?patientID={Patient ID}&startTime={Recording Start Time}&password={API Key}&stethoscopeLocation={Stethoscope Location}&dataType={File Type}
```

**To request a recording file:**  
Patient ID, Recording Start Time, and Stethoscope location are used in tandem to identify a ECG / Audio / Metadata file associated with a given user recording. 

```
GET https://75xtipvj56.execute-api.us-east-1.amazonaws.com/?patientID={Patient ID}&startTime={Recording Start Time}&password={API Key}&stethoscopeLocation={Stethoscope Location}&dataType={"audio" | "ecg" | "meta"}
```

**To request _just_ a HTML/CSS/js file:**  
To just get the HTML/CSS/js, technically only the API key and the path are required. However, the backend will also check that the other parameters are valid to ensure the website can be used once loaded.

## Website
The website is a Single Page Application built using React Hooks. Instad of having users log in, users are authenticated using the API key in the URL parameters. The URL parameters are also used to determine which ECG / Audio / Metadata files to load for display purposes.

As a result, the website only works if it is loaded with proper URL parameters. 

The following is an example of a get request to load the website: https://75xtipvj56.execute-api.us-east-1.amazonaws.com/index.html?patientID=me&startTime=1681681940.810916&password=gokies

## Upload Test Script
This test script is a collection of functions for calling the Heartbeat Processor API. `TODO: use a integration testing framework`