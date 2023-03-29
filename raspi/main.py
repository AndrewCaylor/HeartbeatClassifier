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
  # make sure the file is empty before we start
  os.system("cat /dev/null > rawECG.txt")
  # make sure we have permission to read from the serial port
  os.system("sudo chmod a+rw /dev/ttyACM0")
  # set the baud rate
  os.system("stty -F /dev/ttyACM0 460800")
  # start reading from the serial port
  os.system("cat /dev/ttyACM0 > rawECG.txt")
# start reading from the serial port
threading.Thread(target=beginRead).start()

from gui import gui

gui()