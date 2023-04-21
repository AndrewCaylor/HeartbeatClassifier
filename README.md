# Heartbeat Collection & Classification System

The main objective of the system is to collect the heartbeat of a patient, taking their Electrocardiogram using the ECG leads in sync with the sound of their heartbeat. In order to then transfer that data to a microcontroller for collection to the cloud. A Machine Learning algorithm which screens the recording for four selected umbrella heart abnormalities. The data collected and pre-screening results are sent to an offsite cardiologist via email for expert review on a web portal.

## The Software Systemm

![Cloud architecture diagram](https://lh3.googleusercontent.com/drive-viewer/AAOQEOSrn1egWxgOTAIDwByKLQX1Hl_RtsPvDFaaIJpzqNoQ9WCTUHyDlP2FPSa-sJggHOfZ1zQa0pgJPrx7vtJJKZI1FU3e5Q=s1600)

There are four main elements of the software system:  
1. Arduino
2. Raspberry Pi
3. Cloud
4. Website

The Arduino is only used to read the analog signal coming from the ECG. It sends readings to the Raspberry Pi through a serial connection. It definitly would be better to use an actual ADC on a PCB but we did not have time to implement this. 

The Raspberry Pi is mainly responsible for providing a user interface for a medical professional to take ECG recordings, and upload them to the cloud for processing. 

The Cloud (we use AWS) provides an HTTP POST RESTful API endpoint for ECG data processing, file storage, ML ECG interpretation. Also provides a HTTP GET RESTful API for data access.

The Website is responsible for providing a user interface for the Cardiologist to view the ECG recordings and the corrosponding ML interpretations.   
![Image of example website](https://lh3.googleusercontent.com/drive-viewer/AAOQEOSPRAwETBNwgHxEyfdpmeIrpduQ6xs-B0IXzD-8O0KpAuShOiUnkPhx9ViBu0or4psDh088jjl0suR5zUGh3IHDGLMY=s1600)

## Repo Structure
### /arduino
1. Includes code to turn the Arduino into and ADC
2. Small test script to read serial data

### /aws
1. Includes code executed in the serverless backend (get/post Lambdas)
2. Website code (HTML/CSS/JS)
3. Test script for running Cloud integration tests

### /lambdalayers
Probably should be in the /aws directory. The "Lambda Layer" includes the libraries for the AWS Lambda instance to make API calls to other AWS Services.

### /ml
Tom's code for training our models.

### /models
README explaining how to format models correctly for AWS SageMaker.

### /raspi
Code for reading from ECG/Stethoscope and uploading to the cloud.

## Auxiliary Uses
RickRoll your Cardiologist by sending them this base URL:    
https://75xtipvj56.execute-api.us-east-1.amazonaws.com/test    
Add some more url parameters to make it extra convincing:    
https://75xtipvj56.execute-api.us-east-1.amazonaws.com/test/index.html?patientID=AndrewCaylor&startTime=1681681940&password=cv8YY3fWHvdCPELP    
