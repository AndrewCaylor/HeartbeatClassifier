import os
import re

DURATION = 10
ADC_COEFF = 5/1024


# records ECG and writes to csv file
# this is NOT blocking
def recordECG():

  def writeToFile(amplitudes):
    f2 = open("recordECG.csv", "w")
    f2.write("\n".join(amplitudes))
    f2.close()
  
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

    # if there's not enough data, write an empty file
  if(len(lines) < 10):
    print("No data to record")
    writeToFile([])
    return

  finalTime = int(lines[0].split(" ")[0])
  curTime = finalTime

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

# records audio and writes to wav file
# this is blocking
def recordWAV():
    
    # Read all devices that can record audio
    os.system("arecord -l > temp_784.txt")
    f = open("temp_784.txt")
    data = f.read()

    # look for a microphone to record from
    # this should be a small number
    for i in range(1, 100):
        searchStr = "card " + str(i)
        # If we can record from a device, record from the first one we find
        if(searchStr in data):
            os.system("arecord -Dplughw:" + str(i) + ",0 -f S16_LE --duration=" + str(DURATION) + " -r8000 recordWAV.wav")
            break
    
#     close and delete the temp file
    f.close()
    os.remove("temp_784.txt")

# records audio and ecg and writes to wav and ecg files
# this is blocking
def recordBoth():
    recordWAV()
    recordECG()

if __name__ == "__main__":
    # recordBoth won't work due to relative file locations
    # recordBoth()
    # recordECG(False)
    recordWAV()