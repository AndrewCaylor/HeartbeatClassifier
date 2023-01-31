import os

# Read all devices that can record audio
os.system("arecord -l > out.txt")
f = open("out.txt")
data = f.read()

# If we can record from a device, record from the first one
if("card 1" in data):
    os.system("arecord -Dplughw:1,0 --duration=2 recording.wav")
    print("done")
else:
    print("Error finding microphone")