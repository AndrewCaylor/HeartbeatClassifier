import os
import wave
import numpy as np
import matplotlib.pyplot as plt
import time
import multiprocessing as mp

DURATION = 5
ADC_COEFF = 5/1024


def recordECG(sleep = True):
  if sleep:
    # while we sleeping, the ecg is recording
    time.sleep(DURATION)
  # read from rawECG.txt

  # please forgive my autism
  data = "1 1\n1 1\n1 1"

  try:
    f1 = open("rawECG.txt", "r")
    data = f1.read()
    f1.close()
  except:
    print("Error reading rawECG.txt")

  # get the lines of the data, reverse the order for convenience
  lines = data.split("\n")[::-1]

  finalTime = int(lines[1].split(" ")[0])
  curTime = finalTime

  amplitudes = []

  if(len(lines) < 10):
    print("No data to record")
  else:
    ind = 1
    while finalTime - curTime < DURATION*1000 and ind < len(lines):
      line = lines[ind].split(" ")
      curTime = int(line[0])
      # do 1 - x because Braeden made the ECG wrong
      # TODO: fix this
      amplitudes.insert(0, str( 1 - float(line[1])*ADC_COEFF ))
      ind += 1
      
  # write to ecg.txt
  f2 = open("recordECG.csv", "w")
  f2.write("\n".join(amplitudes))
  f2.close()

#records audio and writes to wav file. returns path to file
def recordWAV():
    
    # Read all devices that can record audio
    os.system("arecord -l > temp_784.txt")
    f = open("temp_784.txt")
    data = f.read()

    # look for a microphone to record from
    # this should be a small number
    found = False
    for i in range(1, 100):
        searchStr = "card " + str(i)
        # If we can record from a device, record from the first one we find
        if(searchStr in data):
            os.system("arecord -Dplughw:" + str(i) + ",0 -f S16_LE --duration=" + str(DURATION) + " -r8000 recordWAV.wav")
            found = True
            break
    
#     close and delete the temp file
    f.close()
    os.remove("temp_784.txt")

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

    filtered = findMinDiff(fourierSignal, fourierNoise)
    back = np.real(np.fft.ifft(filtered))
    
    plt.plot(fourierSignal[0:1000])    
    plt.plot(fourierNoise[0:1000])
    plt.plot(filtered[0:1000])
    plt.show()
    
    
    return back

def readWAV(path):
    with wave.open(path) as f:
        buffer = f.readframes(f.getnframes())
        interleaved = np.frombuffer(buffer, dtype=f'int{f.getsampwidth()*8}')
        data = np.reshape(interleaved, (-1, f.getnchannels()))
        return data
    
def writeWAV(path, data):
    with wave.open(path, "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(8000)
        f.writeframes(data.astype(np.short).tobytes())

def filterWAV(pathOut, pathSignal, pathNoise = None):
    
    signal = readWAV(pathSignal)
    
        # truncate extremes of the data
    pctile = np.percentile(np.abs(signal), 99)        
    data = np.where(signal < pctile, signal, pctile)
    data = np.where(-signal < pctile, signal, -pctile)
    
    if(pathNoise is not None):
        noise = readWAV(pathNoise)
        
        filtered = freqFilterNoise(signal, noise)
        filtered = freqFilter(filtered)

    else:
        filtered = freqFilter(signal)

    maxsize = (2**16)/2.5
    datamax = max(np.max(filtered), -np.min(filtered))

    amped = ((maxsize/datamax) * filtered).astype(int)
        
    writeWAV(pathOut, amped)

def recordBoth():
    wav = mp.Process(target=recordWAV)
    ecg = mp.Process(target=recordECG)
    wav.start()
    ecg.start()
    wav.join()
    ecg.join()

if __name__ == "__main__":
    # recordBoth won't work due to relative file locations
    recordBoth()