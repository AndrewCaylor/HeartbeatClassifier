### Configure Ras Pi to run main on startip:

1. create shell script in documents:  
`run.sh`
2. add the following commands to run.sh:  
```
cd ~/Desktop/HeartBeatClassifier/raspi   
python3 main.py
```  
3. save the file, change to executable:  
``chmod +x run.sh``  
4. run the command to create a new file:  
``sudo nano /etc/xdg/autostart/display.desktop``  
5. edit the file and add the following text:  
```
[Desktop Entry]   
Name=HearCondPred  
Exec=sh /home/<USER>/Documents/run.sh
```
  
now main.py *should* run on startup :)
