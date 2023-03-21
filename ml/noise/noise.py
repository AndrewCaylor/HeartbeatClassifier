import os
import subprocess
import wave
import numpy as np
import matplotlib.pyplot as plt
import time
import multiprocessing as mp


#records audio and writes to wav file. returns path to file
def recordWAV(ind):
    
    tmpfile = "temp_784" + str(ind) + ".txt"
    
    # Read all devices that can record audio
    os.system("arecord -l > " + tmpfile)
    f = open(tmpfile)
    data = f.read()
    lines = data.split("\ncard ")

    searchStr = "USB Lavalier Mic Pro"

    numFound = 0
    # If we can record from a device, record from nth one we can find
    for line in lines:
      if(searchStr in line):
        if numFound == ind:
          deviceNum = line[0]
          print("Recording from device " + str(deviceNum))
          os.system("arecord -Dplughw:" + str(deviceNum) + ",0 -f S16_LE --duration=5 -r8000 recordWAV" + str(ind) + ".wav")
          break
        numFound += 1

    f.close()
    # os.remove(tmpfile)

def freqFilter(signal):
    
    freq = np.fft.fftfreq(signal.size, d=1/8000)
    lowpass = np.abs(freq) < 500
    
    fourier = np.fft.fft(signal.reshape(signal.size,))

    filtered = fourier * lowpass
    back = np.real(np.fft.ifft(filtered))
    
    return back

def findMinDiff(signal1, signal2):
    width = 500
    
    sigSquare1 = np.square(signal1[0:width])
    sigSquare2 = np.square(signal2[0:width])
    out = np.correlate(sigSquare1, sigSquare2, "same")
    
    search = 10
    beginSearch = int(width/2 - search)
    endSearch = int(width/2 + search)
    maxind = np.argmax(out[beginSearch:endSearch])

    shiftamt = int(search - maxind)
    print(shiftamt)
    signal2shifted = np.roll(signal2, shiftamt)
    
    if(shiftamt > 0):
        signal2shifted[0:shiftamt-1] = 0
    if(shiftamt < 0):
        signal2shifted[shiftamt-1:-1] = 0
    
    return signal1 - signal2shifted
    

def freqFilterNoise(signal, noise):
    fourierSignal = np.fft.fft(signal.reshape(signal.size,))
    fourierNoise = np.fft.fft(noise.reshape(noise.size,))

    filtered = fourierSignal - fourierNoise
    back = np.real(np.fft.ifft(filtered))
    
    # plt.plot(fourierSignal[0:1000])    
    # plt.plot(fourierNoise[0:1000])
    # plt.plot(filtered[0:1000])
    # plt.show()
    
    
    return back

def writeWAV(path, data):
    with wave.open(path, "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(8000)
        f.writeframes(data.astype(np.short).tobytes())
def readWAV(path):
    with wave.open(path) as f:
        buffer = f.readframes(f.getnframes())
        interleaved = np.frombuffer(buffer, dtype=f'int{f.getsampwidth()*8}')
        data = np.reshape(interleaved, (-1, f.getnchannels()))
        return data
if __name__ == "__main__":
    wav1 = mp.Process(target=recordWAV, args=(0,))
    wav2 = mp.Process(target=recordWAV, args=(1,))
    wav1.start()
    wav2.start()
    wav1.join()
    wav2.join()

    wavFile = wave.open("recordWAV0.wav", 'r')
    wavFile2 = wave.open("recordWAV1.wav", 'r')
    
    signal = readWAV("recordWAV0.wav")
    signal2 = readWAV("recordWAV1.wav")
    
    wavFile.close()
    wavFile2.close()
    
    filtered = freqFilterNoise(signal, signal2)

    maxsize = (2**16)/2.5
    datamax = max(np.max(filtered), -np.min(filtered))

    amped = ((maxsize/datamax) * filtered).astype(int)
        
    writeWAV("out.wav", amped)

    # write to wav file

    plt.plot(signal)
    plt.show()