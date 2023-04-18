# add folders with submodules to path
import sys
sys.path.insert(0,"./gui")
sys.path.insert(0,"./record")
sys.path.insert(0,"./upload")

# start reading from serial port
import os
import threading
import time

# reads from the serial port and writes to a file
# keeps reading until... NEVER
def beginRead():
  # kill any other processes that are reading from the serial port
  os.system("sudo pkill -f cat")
  
  # wait to allow previous read to finish writing
  # removing the file while cat is writing to the file causes corruption
  time.sleep(.3)
  
  # remove the file so we get a fresh start
  if os.path.exists("rawECG.txt"):
      os.remove("rawECG.txt")
      
  # make sure we have permission to read from the serial port
  os.system("sudo chmod a+rw /dev/ttyACM0")
  
  # set the baud rate
  # higher baudrates cause rare data corrputions
  # but we just have to be resilient to that
  os.system("stty -F /dev/ttyACM0 460800")
  
  # start reading from the serial port
  os.system("cat /dev/ttyACM0 >> rawECG.txt")
  
# read from that serial port
thread = threading.Thread(target=beginRead)
thread.start()

from gui import gui

gui()
