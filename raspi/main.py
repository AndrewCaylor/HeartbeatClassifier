# add folders with submodules to path
import sys
sys.path.insert(0,"./gui")
sys.path.insert(0,"./record")
sys.path.insert(0,"./upload")


from gui import gui

gui()