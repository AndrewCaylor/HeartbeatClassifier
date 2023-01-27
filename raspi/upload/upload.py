import requests
import datetime
import base64
import numpy as np
from io import BytesIO
import json

# Uploads the ECG signal and the respective audio signal to the cloud for processing
# Displays the results of the prediction
def upload(audioData, ecgData, patientID, email, apiKey):
    #python is stupid and decides to add some characters to the beginning and the end    
    audioB64 = str(base64.b64encode(audioData))[2:-1]
    ecgB64 = str(base64.b64encode(ecgData))[2:-1]
        
    presentDate = datetime.datetime.now()
    unix_timestamp = datetime.datetime.timestamp(presentDate)
    
    url = "https://75xtipvj56.execute-api.us-east-1.amazonaws.com/upload"
    myobj = {
        "audio": audioB64,
        "ecg": ecgB64,
        "patientID": patientID, 
        "destEmail": email,
        "startTime": str(unix_timestamp),
        "password": apiKey,
    }

    jsonstr = json.dumps(myobj)
    
    print("Sending request to server...")
            
    # making the request to the server
    x = requests.post(url, data = jsonstr)
    
    print("Classificaiton results:")
    print(x.text)

# Converts the CSV file to an array buffer of Float32
def csvEncode(path):
    with open(path) as fp:
        lines = fp.readlines()
    
    # creates the 186 length list 
    f32arr = np.zeros((1,186), dtype=np.float32)
    for i in range(len(lines)):
        f32arr[0,i] = float(lines[i])
    arrbytes = f32arr.tobytes()
    
    return arrbytes
        
with open("beep.wav", "rb") as f:
    audio = f.read()
    # andrewc01@vt.edu is the only email that works because we are not verified
    upload(audio,csvEncode("ecg.csv"),"drew","andrewc01@vt.edu","gokies")
