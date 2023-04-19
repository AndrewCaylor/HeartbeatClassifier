#!/usr/bin/env python
# coding: utf-8

# In[4]:


# In[9]:


import pandas as pd
import numpy as np
import wfdb
import ast

from scipy.interpolate import interp1d
import matplotlib.pyplot as plt
import numpy as np
import peakutils

import tensorflow.keras as keras

from tensorflow.keras.layers import (Input, Convolution1D, Convolution2D, SpatialDropout1D, 
                                     MaxPooling1D, AveragePooling1D, MaxPooling2D, MaxPooling3D, Flatten, Concatenate, 
                                     Reshape, GlobalMaxPooling1D,
                                     GlobalAveragePooling1D, 
                                     Dropout, Dense, BatchNormalization)
from tensorflow.keras import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras import metrics
from math import floor
from tensorflow.keras.utils import plot_model
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint



from keras import backend as K




# CHANGE HERE TO CHANGE MODELS ASSESSED
model1 = keras.models.load_model('Model CD FINAL')
model2 = keras.models.load_model('Model MI FINAL')
model3 = keras.models.load_model('Model HYP FINAL')
model4 = keras.models.load_model('Model STTC FINAL')

labels = np.load('SegmentedLabels.npy',allow_pickle=True)
segments = np.load('DataSegmented.npy')

    


segments = np.asarray(segments)[:,:,0].astype('float32')
resultsCD = model1.predict(segments)
resultsHYP = model3.predict(segments)
resultsMI = model2.predict(segments)
resultsSTTC = model4.predict(segments)


# CHANGE OUTPUT FILE NAMES HERE
np.save("CDResultsFinal.npy", resultsCD)
np.save("HYPResultsFinal.npy", resultsHYP)
np.save("MIResultsFinal.npy", resultsMI)
np.save("STTCResultsFinal.npy", resultsSTTC)

np.save("Labels.npy", np.array(labels,dtype=object))
