# add folders with submodules to path
import sys
sys.path.insert(0,"./gui")
sys.path.insert(0,"./record")
sys.path.insert(0,"./upload")

# start reading from serial port
import os
import threading

# reads from the serial port and writes to a file
# keeps reading until program is terminated
def beginRead():
  if os.path.exists("rawECG.txt"):
      os.remove("rawECG.txt")
  # kill any other processes that are reading from the serial port
  os.system("sudo pkill -f cat")
  # make sure we have permission to read from the serial port
  os.system("sudo chmod a+rw /dev/ttyACM0")
  # set the baud rate
  os.system("stty -F /dev/ttyACM0 460800")
  # start reading from the serial port
  os.system("cat /dev/ttyACM0 >> rawECG.txt")
# start reading from the serial port
thread = threading.Thread(target=beginRead)
thread.start()

from gui import gui

gui()
