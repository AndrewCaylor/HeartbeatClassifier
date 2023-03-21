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
    
    plt.plot(fourierSignal[0:1000])    
    plt.plot(fourierNoise[0:1000])
    plt.plot(filtered[0:1000])
    plt.show()
    
    
    return back

if __name__ == "__main__":
    wav1 = mp.Process(target=recordWAV, args=(0,))
    wav2 = mp.Process(target=recordWAV, args=(1,))
    wav1.start()
    wav2.start()
    wav1.join()
    wav2.join()

    wavFile = wave.open("recordWAV0.wav", 'r')
    wavFile2 = wave.open("recordWAV1.wav", 'r')
    
    signal = wavFile.readframes(-1)
    signal = np.frombuffer(signal, dtype=np.int16)
    signal = signal / 32768.0
    
    signal2 = wavFile2.readframes(-1)
    signal2 = np.frombuffer(signal2, dtype=np.int16)
    signal2 = signal2 / 32768.0
    
    wavFile.close()
    wavFile2.close()
    
    outsignal = freqFilterNoise(signal, signal2)

    # write to wav file

    wavFile = wave.open("output.wav", 'w')
    wavFile.setnchannels(1)
    wavFile.setsampwidth(2)
    wavFile.setframerate(8000)
    wavFile.writeframes(outsignal)
    wavFile.close()
    
    plt.plot(signal)
    plt.show()