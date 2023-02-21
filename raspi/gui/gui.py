# add folders with submodules to path
import sys
if(__name__ == "__main__"):
    sys.path.insert(0,"./../record")
    sys.path.insert(0,"./../upload")
    
import tkinter as tk
from tkinter import messagebox
import os
import os.path as Path
from record import recordWAV, recordECG, filterWAV
from upload import encodeCSV, encodeWAV, upload
import time

def gui():
    # UPLOAD VARS (others are defined in upload script)
    EMAIL = "andrewc01@vt.edu"
    PATIENT_ID = "me"
    
    window = tk.Tk()

    # create a fullscreen window
    window.attributes('-fullscreen', True)
    window.title("Heartbeat Analysis Tool")

    # ButtonMenu widgets
    viewPlaybackButton = tk.Button(window, text="View Playback", command = lambda: transitionState("playback"))
    recordButton = tk.Button(window, text="Record", command = lambda: transitionState("recordmenu"))
    settingsButton = tk.Button(window, text="Settings", command = lambda: transitionState("settings"))

    exitButton = tk.Button(window, text="Exit", command = lambda: transitionState("menu"))

    #record widgets
    def recordAndUpload():
        recordTextVar.set("Recording...")
        window.update()
        
        wavPath = "record.wav"
        filteredPath = "filtered.wav"
        
        successWav = recordWAV(wavPath)
        successFilter = filterWAV(filteredPath, wavPath)
        ecgpath = recordECG()
        
        recordTextVar.set("Uploading...")
        window.update()
        
        wavData = encodeWAV(filteredPath)
        ecgData = encodeCSV(ecgpath)
        
        result = upload(wavData, ecgData, PATIENT_ID, EMAIL, "gokies")
        
        recordTextVar.set("Done! \n Results: " + result)
        window.update()
                
    doRecordButton = tk.Button(window, text="Start Recording", command = recordAndUpload)
    recordTextVar = tk.StringVar(window, "")
    recordStatusLabel = tk.Label(window, textvariable=recordTextVar)

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

    def clear():
    #     make sure to run pack_forget for each widget :P
        viewPlaybackButton.pack_forget()
        recordButton.pack_forget()
        settingsButton.pack_forget()
        
        doRecordButton.pack_forget()
        recordStatusLabel.pack_forget()
        
        patientIDLabel.pack_forget()
        cardiologistEmailLabel.pack_forget()
        patientIDInput.pack_forget()
        emailInput.pack_forget()
        saveButton.pack_forget()
        
        playButton.pack_forget()

        exitButton.pack_forget()

    # create sort of a state machine
    # previous state is irrelevant (for now)
    def transitionState(state):
        #first undraw all buttons/items
        clear()
        
        #then redraw the items for the correct state
        if(state == "settings"):
            editSettings()
        elif(state == "playback"):
            viewPlayback()
        elif(state == "recordmenu"):
            recordMenu()
        else:
            menu()

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
        doRecordButton.pack()
        recordStatusLabel.pack()
        
        exitButton.pack()

        
    def menu():
        viewPlaybackButton.pack()
        recordButton.pack()
        settingsButton.pack()
        
    # start on the menu state
    transitionState("menu")
    # do the thing
    window.mainloop()
