# add folders with submodules to path
import sys
if(__name__ == "__main__"):
    sys.path.insert(0,"./../record")
    sys.path.insert(0,"./../upload")
    
import tkinter as tk
from tkinter import messagebox
import os
import os.path as Path
from record import recordBoth, filterWAV
from upload import encodeCSV, encodeWAV, upload
import datetime
import time

lastState = "none"
unix_timestamp = 0


def gui():
    # UPLOAD VARS (others are defined in upload script)
    EMAIL = "andrewc01@vt.edu"
    PATIENT_ID = "me"
    
    window = tk.Tk()

    # create a fullscreen window
    window.attributes('-fullscreen', True)
    window.title("Heartbeat Analysis Tool")
    
    window.columnconfigure(0, weight=1)
    window.columnconfigure(1, weight=1)

    # ButtonMenu widgets
    viewPlaybackButton = tk.Button(window, text="View Playback", command = lambda: transitionState("playback"))
    recordButton = tk.Button(window, text="Record", command = lambda: transitionState("recordmenu"))
    settingsButton = tk.Button(window, text="Settings", command = lambda: transitionState("settings"))

    exitButton = tk.Button(window, text="Exit", command = lambda: transitionState("menu"))

    #record widgets
    def recordAndUpload():
        global unix_timestamp
        recordTextVar.set("Recording...")
        window.update()
        
        filteredPath = "filtered.wav"
        
        recordBoth()
        # successFilter = filterWAV(filteredPath, wavPath)
        
        recordTextVar.set("Uploading...")
        window.update()
        
        wavData = encodeWAV("recordWAV.wav")
        ecgData = encodeCSV("recordECG.csv")
        
        result = upload(wavData, ecgData, PATIENT_ID, EMAIL, "gokies", unix_timestamp, stethLoc.get(), True)
        
        recordTextVar.set("Results: " + result)
        window.update()
    
    doRecordButton = tk.Button(window, text="Start Recording", command = recordAndUpload)
    recordTextVar = tk.StringVar(window, "")
    recordStatusLabel = tk.Label(window, textvariable=recordTextVar)
    
    stethLoc = tk.StringVar(window, "unknown")
    radio1 = tk.Radiobutton(window, text="Aortic", value="aortic", variable=stethLoc)
    radio2 = tk.Radiobutton(window, text="Mitrial", value="mitrial", variable=stethLoc)
    radio3 = tk.Radiobutton(window, text="Tricuspid", value="tricuspid", variable=stethLoc)
    radio4 = tk.Radiobutton(window, text="Pulmonic", value="pulmonic", variable=stethLoc)
    radio5 = tk.Radiobutton(window, text="None", value="unknown", variable=stethLoc)
    
    sendEmail = tk.StringVar(window, "false")
    sendEmailCheck = tk.Checkbutton(window, text="Send Email", variable=sendEmail,  onvalue="true", offvalue="false")

    #settings widgets

    patientIDVar = tk.StringVar(window, "Patient ID: " + PATIENT_ID)
    emailVar = tk.StringVar(window, "Cardiologist Email: " + EMAIL)
    
    patientIDLabel = tk.Label(window, textvariable=patientIDVar)
    cardiologistEmailLabel = tk.Label(window, textvariable=emailVar)
    patientIDInput = tk.Entry(window)
    emailInput = tk.Entry(window)
    
    def updateVars():
        PATIENT_ID = patientIDInput.get()
        EMAIL = emailInput.get()
        patientIDVar.set("Patient ID: " + PATIENT_ID)
        emailVar.set("Cardiologist Email: " + EMAIL)
        
    saveButton = tk.Button(window, text="Save", command = updateVars)

    #playback widgets
    def playAudio():
        path = "./recording.wav"
        if(Path.isfile(path)):
            val = os.system("aplay " + path)
        else:
            tk.messagebox.showerror("Error", "No recording present, record audio by running the record script")
    playButton = tk.Button(window, text="Play Audio", command = lambda: playAudio())

    #functions to display info for each state

    def clear(lastState):
    #     make sure to run pack_forget for each widget :P
        viewPlaybackButton.pack_forget()
        recordButton.pack_forget()
        settingsButton.pack_forget()
        
        doRecordButton.grid_forget()
        recordStatusLabel.grid_forget()
        radio1.grid_forget()
        radio2.grid_forget()
        radio3.grid_forget()
        radio4.grid_forget()
        radio5.grid_forget()

        
        patientIDLabel.pack_forget()
        cardiologistEmailLabel.pack_forget()
        patientIDInput.pack_forget()
        emailInput.pack_forget()
        saveButton.pack_forget()
        
        playButton.pack_forget()
        
        
        if(lastState == "recordmenu"):
            exitButton.grid_forget()
        else:
            exitButton.pack_forget()

    # create sort of a state machine
    # previous state is irrelevant (for now)
    def transitionState(state):
        global lastState
        #first undraw all buttons/items
        clear(lastState)
                
        #then redraw the items for the correct state
        if(state == "settings"):
            editSettings()
        elif(state == "playback"):
            viewPlayback()
        elif(state == "recordmenu"):
            recordMenu()
        elif(state == "menu" and lastState == "menu"):
            exit()
        else:
            menu()
            
        lastState = state

    def editSettings():
        patientIDLabel.pack()
        patientIDInput.pack()

        cardiologistEmailLabel.pack()
        emailInput.pack()
        
        patientIDInput.delete(0, 999999)
        patientIDInput.insert(0, PATIENT_ID)
        emailInput.delete(0, 999999)
        emailInput.insert(0, EMAIL)

        saveButton.pack()
        
        exitButton.pack()


    def viewPlayback():
        playButton.pack()
        
        exitButton.pack()

        
    def recordMenu():
        global unix_timestamp
        presentDate = datetime.datetime.now()
        unix_timestamp = datetime.datetime.timestamp(presentDate)
                
        doRecordButton.grid(column=0, row=0)
        recordStatusLabel.grid(column=0, row=1)
        exitButton.grid(column=0, row=2)

        radio1.grid(column=1, row=0)
        radio2.grid(column=1, row=1)
        radio3.grid(column=1, row=2)
        radio4.grid(column=1, row=3)
        radio5.grid(column=1, row=4)
 
        
    def menu():
        viewPlaybackButton.pack()
        recordButton.pack()
        settingsButton.pack()
        exitButton.pack()

        
    # start on the menu state
    transitionState("menu")
    # do the thing
    window.mainloop()
