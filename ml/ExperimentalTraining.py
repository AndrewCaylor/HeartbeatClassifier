#!/usr/bin/env python
# coding: utf-8


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

import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score
from sklearn.metrics import confusion_matrix
from keras.utils.np_utils import to_categorical
from sklearn.utils import class_weight
import warnings
from tensorflow.keras import regularizers
from tensorflow.keras import initializers
import neurokit2 as nk


# LOAD X(segments) AND Y(labels) 
labels = np.load('SegmentedLabels.npy',allow_pickle=True)
segments = np.load('DataSegmented.npy')

# CHANGE CONDITION OF INTEREST HERE 
conditionOfInterest = 'MI'


# GET X AND Y FOR SEGMENTS OF INTEREST ( AFFECTED WITH CONDITION OR NORMAL )
segments2 = list()
labels2= list()
for i in range(len(labels)):
    label = labels[i]
    segment = segments[i]
    if 'NORM' in label:
        segments2.append(segment)
        labels2.append(0)
    if conditionOfInterest in label:
        segments2.append(segment)
        labels2.append(1)
    

# MAKE X AND Y TO BE SAMPLED
y_new = np.asarray(labels2)
print(pd.DataFrame(y_new).value_counts())

# GOOD CHANNELS SO FAR - 0 ,1(Very Good), 2, 3, 6, 8 
# NOT GOOD SO FAR 9, 10, 11
x_new = np.asarray(segments2)[:,:,[0,1,2]].astype('float32')

X_train, X_test, y_train,  y_test = train_test_split(x_new, y_new, train_size=0.66, stratify=y_new)







print(X_train.shape)
print(y_train.shape)

initializer = initializers.Orthogonal()

def network(X_train,y_train,X_test,y_test):
    

    inputLen = 100
    input_ = Input(shape=(int(inputLen),3))
    
    num_filters = 100
    resulting_filters = num_filters * 2
    dropout = 0.05
    pooling = True
    
    
    branch_1 = Convolution1D(filters=num_filters*2, kernel_size=3, dilation_rate=1, padding='same',activation = 'relu', kernel_initializer=initializer) (input_)
    branch_1 = SpatialDropout1D(dropout)(branch_1)

    branch_1 = BatchNormalization()(branch_1)
    branch_1 = Reshape((int(inputLen),resulting_filters,1))(branch_1)
    
    branch_2 = Convolution1D(filters=num_filters*2, kernel_size=3, dilation_rate=2, padding='same',activation = 'relu', kernel_initializer=initializer) (input_)
    branch_2 = SpatialDropout1D(dropout)(branch_2)

    branch_2 = BatchNormalization()(branch_2)
    branch_2 = Reshape((int(inputLen),resulting_filters,1))(branch_2)
    
    branch_3 = Convolution1D(filters=num_filters*2, kernel_size=3, dilation_rate=3, padding='same',activation = 'relu', kernel_initializer=initializer) (input_)
    branch_3 = SpatialDropout1D(dropout)(branch_3)

    branch_3 = BatchNormalization()(branch_3)
    branch_3 = Reshape((int(inputLen),resulting_filters,1))(branch_3)
    
    branch_4 = Convolution1D(filters=num_filters*2, kernel_size=3, dilation_rate=4, padding='same',activation = 'relu', kernel_initializer=initializer) (input_)
    branch_4 = SpatialDropout1D(dropout)(branch_4)
    
    
    branch_4 = BatchNormalization()(branch_4)
    branch_4 = Reshape((int(inputLen),resulting_filters,1))(branch_4)
    
    branch_5 = Convolution1D(filters=num_filters*2, kernel_size=3, dilation_rate=5, padding='same',activation = 'relu', kernel_initializer=initializer) (input_)
    branch_5 = SpatialDropout1D(dropout)(branch_5)
    
    branch_5 = BatchNormalization()(branch_5)
    branch_5 = Reshape((int(inputLen),resulting_filters,1))(branch_5)
    
    branch_6 = Convolution1D(filters=num_filters*2, kernel_size=3, dilation_rate=6, padding='same',activation = 'relu', kernel_initializer=initializer) (input_)
    branch_6 = SpatialDropout1D(dropout)(branch_6)
    branch_6 = BatchNormalization()(branch_6)
    branch_6 = Reshape((int(inputLen),resulting_filters,1))(branch_6)
    
    



    num2DFil = 1500
    concat = Concatenate(axis=3) ([branch_1, branch_2, branch_3, branch_4, branch_5,branch_6])
    concat = Convolution2D(filters = num2DFil, kernel_size=(3,resulting_filters), kernel_initializer=initializer) (concat)
    concat = Reshape((98,num2DFil))(concat)
    concat = SpatialDropout1D(0.1)(concat)
    
    
   
    for i in range(1,12):
        concat= Convolution1D(filters=(int)(125 * (1.25**((6-i)+3))), kernel_size=3,padding="valid",activation = 'relu')(concat)
        if (i % 5 == 0): 
            concat=  MaxPooling1D(pool_size=2, strides=2) (concat)
    
   
    concat = Flatten()(concat)
    concat = Dense(256,activation='relu') (concat) 
    concat = Dense(128,activation='relu') (concat) 
    concat = Dense(64,activation='relu') (concat) 
    concat = Dense(64,activation='relu') (concat)
    out = Dense(1, activation = 'sigmoid') (concat)


    model = Model(inputs=input_, outputs=out)
    class_weights = class_weight.compute_class_weight(
                                        class_weight = "balanced",
                                        classes = np.unique(y_train),
                                        y = y_train                                                    
                                    )
    weights = dict(zip(np.unique(y_train), class_weights))
    
    print(weights)
    model.compile(optimizer=Adam(lr=0.0001),loss= 'binary_crossentropy',
                metrics=['accuracy','binary_accuracy', metrics.Precision(), metrics.Recall()]) 
    callbacks = [EarlyStopping(monitor='val_loss', patience=5), ModelCheckpoint(filepath='best_model.h5', monitor='val_loss', save_best_only=True)]
    history= 0
    model.summary()
    history=model.fit(X_train, y_train,epochs=40,callbacks=callbacks, batch_size=200,validation_data=(X_test,y_test), class_weight=weights)
    model.load_weights('best_model.h5')
    return(model,history)




# TRAIN MODEL
model,history=network(X_train,y_train,X_test,y_test)

# CHANGE SAVED MODEL PATH HERE
model.save("Model " + "Experimental MI 3 LEAD")

