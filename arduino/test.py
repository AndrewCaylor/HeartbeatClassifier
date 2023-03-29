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
  os.system("cat /dev/ttyACM01 > rawECG.txt")
# start reading from the serial port
threading.Thread(target=beginRead).start()
