# add folders with submodules to path
import sys
if(__name__ == "__main__"):
    sys.path.insert(0,"./../record")
    sys.path.insert(0,"./../upload")
    
import tkinter as tk
from tkinter import font
import os
import os.path as Path
from record import recordBoth, filterWAV
from upload import encodeCSV, encodeWAV, upload
import datetime
import json
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg


WAVPATH = "recordWAV.wav"
ECGPATH = "recordECG.csv"

lastState = "none"
unix_timestamp = 0
predStr = ""

def formatTable():
    global predStr
    print(predStr)
    results = json.loads(predStr)
    for result in results:
        print(result['predictions'])

    outstr = "Num|  N   |  1   |  2   |  3   | \n"

    for beatInd in range(len(results[0]['predictions'])):
        resultsStr = ""
        normalAvg = 0

        for condition in results:
            beatPred = condition['predictions'][beatInd]
            resultsStr += f'{beatPred[1]:.2f} | '
            normalAvg += beatPred[0]
        normalAvg /= len(results)
        outstr += f'  {beatInd}| {normalAvg:.2f} | {resultsStr}\n'

    return outstr
    

def gui():
    # UPLOAD VARS (others are defined in upload script)
    EMAIL = "andrewc01@vt.edu"
    PATIENT_ID = "me"
    
    window = tk.Tk()

    # create a fullscreen window
    # window.attributes('-fullscreen', True)
    window.title("Heartbeat Analysis Tool")

    # increase widget font sizes
    defaultFont = font.nametofont("TkDefaultFont")
    defaultFont.configure(size=20)
    defaultFont.configure(family="Helvetica")

    # set default font for all dialogs
    window.option_add('*Dialog.msg.font', 'Helvetica 20')

    window.columnconfigure(0, weight=1)
    window.columnconfigure(1, weight=1)

    # ButtonMenu widgets
    recordButton = tk.Button(window, text="Record and Interpret", command = lambda: transitionState("recordmenu"))
    viewPlaybackButton = tk.Button(window, text="View Last Recording", command = lambda: transitionState("playback"))
    settingsButton = tk.Button(window, text="Settings", command = lambda: transitionState("settings"))
    exitButton = tk.Button(window, text="Exit", command = lambda: transitionState("menu"))

    #Record/Interpret widgets
    def recordAndUpload():
        global unix_timestamp
        global predStr

        recordTextVar.set("Recording...")
        window.update()
        
        filteredPath = "filtered.wav"
        
        recordBoth()
        # successFilter = filterWAV(filteredPath, wavPath)
        
        recordTextVar.set("Uploading...")
        window.update()
        
        wavData = encodeWAV(WAVPATH)
        ecgData = encodeCSV(ECGPATH)
        
        predStr = upload(wavData, ecgData, PATIENT_ID, EMAIL, "gokies", unix_timestamp, stethLoc.get(), True)
        recordTextVar.set("Done!")
        
        transitionState("results")
        
        window.update()
    
    def gotoResults():
        transitionState("results")

    doRecordButton = tk.Button(window, text="Start Recording", command = recordAndUpload)
    viewResultsButton = tk.Button(window, text="View Interpretation", command = gotoResults)

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

    #Results widgets
    resultsVar = tk.StringVar(window, "")
    resultsLabel = tk.Label(window, textvariable=resultsVar)

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
        if(Path.isfile(WAVPATH)):
            os.system("aplay " + WAVPATH)
        else:
            tk.messagebox.showerror("Error", "No recording present!")
    playButton = tk.Button(window, text="Play Audio", command = lambda: playAudio())

    ecgGraph = Figure(figsize=(5,4), dpi=100)
    ecgFigureCanvas = FigureCanvasTkAgg(ecgGraph, master=window)

    #functions to display info for each state

    def clear(lastState):
    #     make sure to run pack_forget for each widget :P
        viewPlaybackButton.pack_forget()
        recordButton.pack_forget()
        settingsButton.pack_forget()
        
        doRecordButton.grid_forget()
        recordStatusLabel.grid_forget()
        viewResultsButton.grid_forget()
        radio1.grid_forget()
        radio2.grid_forget()
        radio3.grid_forget()
        radio4.grid_forget()
        radio5.grid_forget()

        resultsLabel.pack_forget()
        
        patientIDLabel.pack_forget()
        cardiologistEmailLabel.pack_forget()
        patientIDInput.pack_forget()
        emailInput.pack_forget()
        saveButton.pack_forget()
        
        playButton.pack_forget()
        ecgFigureCanvas.get_tk_widget().pack_forget()
        
        
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
        elif(state == "results"):
            viewResults()
        elif(state == "menu" and lastState == "menu"):
            # exit() won't work because we are running a thread in the background
            os.abort()
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
        ecgGraph.clear()

        with open(ECGPATH) as f:
            lines = f.readlines()
            lines = [float(x.strip()) for x in lines]
            times = [5*x/len(lines) for x in range(0, len(lines))]

            ecgGraph.add_subplot(111).plot(times, lines)
            ecgFigureCanvas.get_tk_widget().pack()
            
            exitButton.pack()

    def viewResults():
        try:
          resultsVar.set(formatTable())
        except:
          global predStr
          resultsVar.set(predStr)
        resultsLabel.pack()
        exitButton.pack()

    def recordMenu():
        global unix_timestamp
        global predStr
        presentDate = datetime.datetime.now()
        unix_timestamp = datetime.datetime.timestamp(presentDate)
                
        doRecordButton.grid(column=0, row=0)
        recordStatusLabel.grid(column=0, row=1)
        if(predStr != ""):
            viewResultsButton.grid(column=0, row=2)
            exitButton.grid(column=0, row=3)
        else:
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
