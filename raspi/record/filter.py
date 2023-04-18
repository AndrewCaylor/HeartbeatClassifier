
import wave
from matplotlib import pyplot as plt
import numpy as np

# some audio filtering testing

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
