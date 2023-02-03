Configure Ras Pi to run main on startip:

1. create shell script in documents: run.sh
2. add the command: python ./../Desktop/HeartBeatClassifier/raspi/main.py
3. save the file
4. run the command: sudo nano /etc/rc.local
5. edit the file and add the command: sh /home/<USER>/Documets/run.sh

now main.py should run on startup :)
