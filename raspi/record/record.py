import os
    
#records audio and writes to wav file. returns path to file
def recordWAV():
    relativePath = "recording.wav"
    
    # Read all devices that can record audio
    os.system("arecord -l > temp.txt")
    f = open("temp.txt")
    data = f.read()

    # look for a microphone to record from
    # this should be a small number
    found = False
    for i in range(1, 100):
        searchStr = "card " + str(i)
        # If we can record from a device, record from the first one we find
        if(searchStr in data):
            os.system("arecord -Dplughw:" + str(i) + ",0 --duration=2 " + relativePath)
            found = True
            break
    
#     close and delete the temp file
    f.close()
    os.remove("temp.txt")
    
    if found:
        return relativePath
    else:
        print("Error finding microphone")

#records ECG and writes to csv file
def recordECG():
    #TODO implement this function for real
    return "ecg.csv"
    
if __name__ == "__main__":
    recordWav()
