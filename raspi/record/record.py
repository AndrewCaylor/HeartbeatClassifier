import os
import re
import wave
import numpy as np
import matplotlib.pyplot as plt
import time
import multiprocessing as mp

DURATION = 5
ADC_COEFF = 5/1024


def recordECG(sleep = True):

  def writeToFile(amplitudes):
    f2 = open("recordECG.csv", "w")
    f2.write("\n".join(amplitudes))
    f2.close()

  if sleep:
    # while we sleeping, the ECG is recording in a different thread
    time.sleep(DURATION)
  
  # read bytes from rawECG.txt
  # split the bytes into lines
  data = ""
  try:
    f1 = open("rawECG.txt", "rb")
    data = f1.read()
    data = data.split(b"\n")
    f1.close()
  except Exception as e:
    print(str(e))
    print("Error reading rawECG.txt")
    writeToFile([])
    return

  # convert each line to a string
  # if decoding to utf-8 fails, skip the line
  # if the line doesn't match the regex, skip the line
  # this is done to be resilient to corrupted data
  dataStr = []
  for line in data:
    try:
      decoded = line.decode("utf-8")
      x = re.search("^(\d+) (\d+)", decoded)
      if x:
        dataStr.append(decoded)
    except:
      print("Error decoding line: " + str(line))
  
  # reverse the order for convenience
  lines = dataStr[::-1]

  finalTime = int(lines[1].split(" ")[0])
  curTime = finalTime

  # if there's not enough data, write an empty file
  if(len(lines) < 10):
    print("No data to record")
    writeToFile([])
    return
  
  # get the last DURATION seconds of data
  amplitudes = []
  ind = 1
  while finalTime - curTime < DURATION*1000 and ind < len(lines):
    line = lines[ind].split(" ")
    curTime = int(line[0])
    amplitudes.insert(0, str(float(line[1])*ADC_COEFF))
    ind += 1
    
  # write to ecg.txt
  writeToFile(amplitudes)

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
    # recordBoth()
    recordECG(False)