import os
import wave
import numpy as np
import matplotlib.pyplot as plt

relativePath = "recording.wav"

#records audio and writes to wav file. returns path to file
def recordWAV():
    
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
            os.system("arecord -Dplughw:" + str(i) + ",0 -f S16_LE --duration=5 -r8000 " + relativePath)
            found = True
            break
    
#     close and delete the temp file
    f.close()
    os.remove("temp.txt")
    
    if found:
        return relativePath
    else:
        print("Error finding microphone")

def freqFilter(signal):
    freq = np.fft.fftfreq(signal.size, d=1/8000)
    lowpass = np.abs(freq) < 400
    
    fourier = np.fft.fft(signal.reshape(40000,))
    filtered = fourier * lowpass
    back = np.real(np.fft.ifft(filtered))
    
    return back

def filterWAV(path):
    filteredPath = "filtered.wav"
    with wave.open(path) as f:
        buffer = f.readframes(f.getnframes())
        interleaved = np.frombuffer(buffer, dtype=f'int{f.getsampwidth()*8}')
        data = np.reshape(interleaved, (-1, f.getnchannels()))
        
        filtered = freqFilter(data)
        
        maxsize = (2**16)/3
        datamax = np.max(filtered)

        amped = ((maxsize/datamax) * filtered).astype(int)
        
        with wave.open(filteredPath, "w") as outf:
            outf.setnchannels(1)
            outf.setsampwidth(2)
            outf.setframerate(8000)
            outf.writeframes(amped.astype(np.short).tobytes())
            
            return filteredPath
        

#records ECG and writes to csv file
def recordECG():
    #TODO implement this function for real
    return "ecg.csv"
    
if __name__ == "__main__":
    print(2 ** 16)
    path = recordWAV()
    filterWAV(path)
