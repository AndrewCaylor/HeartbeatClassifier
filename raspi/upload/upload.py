import requests
import datetime
import base64
import numpy as np
from io import BytesIO
import json

# Uploads the ECG signal and the respective audio signal to the cloud for processing
# Displays the results of the prediction
def upload(audioData, ecgData, sampleRate, patientID, email, apiKey, sess, stethoscopeLocation = "unknown", sendEmail = False):
    #python is stupid and decides to add some characters to the beginning and the end    
    audioB64 = str(base64.b64encode(audioData))[2:-1]
    ecgB64 = str(base64.b64encode(ecgData))[2:-1]

    url = "https://75xtipvj56.execute-api.us-east-1.amazonaws.com/upload"
    myobj = {
        "audio": audioB64,
        "ecg": ecgB64,
        "patientID": patientID, 
        "destEmail": email,
        "startTime": str(sess),
        "password": apiKey,
        "sampleRate": sampleRate,
        "stethoscopeLocation": stethoscopeLocation,
        "sendEmail": sendEmail
    }

    jsonstr = json.dumps(myobj)
    
    print("Sending request to server...")
            
    # making the request to the server
    x = requests.post(url, data = jsonstr)
    
    print("Classificaiton results:")
    print(x.text)
    return x.text

# Converts the CSV file to an array buffer of Float32
def encodeCSV(path):
    with open(path) as fp:
        lines = fp.readlines()
    return encodeArr(lines), len(lines)

def encodeArr(arr):
    # creates the 186 length list 
    f32arr = np.zeros((1,len(arr)), dtype=np.float32)
    for i in range(len(arr)):
        f32arr[0,i] = float(arr[i])
    arrbytes = f32arr.tobytes()
    
    return arrbytes

def encodeWAV(path):
    with open(path, "rb") as f:
        audio = f.read()
        return audio

if __name__ == "__main__":
    with open("beep.wav", "rb") as f:
        audio = f.read()
        # andrewc01@vt.edu is the only email that works because we are not verified
        upload(audio,encodeCSV("ecg.csv"),"drew","andrewc01@vt.edu","gokies")
