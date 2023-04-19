
import pandas as pd
import numpy as np
import wfdb
import ast
import neurokit2 as nk
from scipy.interpolate import interp1d
import matplotlib.pyplot as plt
import numpy as np
import peakutils




def load_raw_data(df, sampling_rate, path):
    if sampling_rate == 100:
        data = [wfdb.rdsamp(path+f) for f in df.filename_lr]
    else:
        data = [wfdb.rdsamp(path+f) for f in df.filename_hr]
    data = np.array([signal for signal, meta in data])
    return data

# INSERT PATH TO DATASET
path = ''
sampling_rate=100

# load and convert annotation data
Y = pd.read_csv(path+'ptbxl_database.csv', index_col='ecg_id')
Y.scp_codes = Y.scp_codes.apply(lambda x: ast.literal_eval(x))

# Load raw signal data
X = load_raw_data(Y, sampling_rate, path)

# Load scp_statements.csv for diagnostic aggregation
agg_df = pd.read_csv(path+'scp_statements.csv', index_col=0)
agg_df = agg_df[agg_df.diagnostic == 1]

def aggregate_diagnostic(y_dic):
    tmp = []
    for key in y_dic.keys():
        if key in agg_df.index:
            tmp.append(agg_df.loc[key].diagnostic_class)
    return list(set(tmp))

# Apply diagnostic superclass
Y['diagnostic_superclass'] = Y.scp_codes.apply(aggregate_diagnostic)

y = Y['diagnostic_superclass'].tolist()





def resampling(sequenceIn, desiredLen):
    
    lengthIn = len(sequenceIn)
    x = np.linspace(0,lengthIn-1,num=lengthIn, endpoint=True)
    f = interp1d(x, sequenceIn,kind='quadratic')
    xnew = np.linspace(0,lengthIn-1,num=desiredLen)
    return f(xnew)

def peakSegmentation(data):
    dataStack = data[:,1]
    back = nk.ecg_clean(dataStack, sampling_rate = 100)
    
#     ensure the data is 0-1
    preppedData = myNormalize(back)
    
    indexes = nk.ecg_findpeaks(preppedData, sampling_rate=100, method='neurokit', show=False).get("ECG_R_Peaks")

    
    results = list()
#     don't include the first and the last peak
    for i in range(1, len(indexes) - 2):
#         make a window around the peak
        start = int((indexes[i] + indexes[i-1])/2)
        end = int((indexes[i+1] + indexes[i])/2)
        result = np.zeros((100,12));
        for j in range(12):
            channel = myNormalize(resampling(nk.ecg_clean(data[start:end,j], sampling_rate = 100),100))
            result[:,j] = channel
        results.append(result)


    results = np.array(results,dtype=object)
    return results

def myNormalize(dataIn):
    
    dataOut = (dataIn-np.min(dataIn))/(np.max(dataIn)-np.min(dataIn))
    return dataOut




def getSegments(dataIn, sampleN):
    sample = dataIn[sampleN,:,:]
#     plt.plot(normalize(sample))
#     plt.show()
    return peakSegmentation(sample)





# Prealloc more segments than expected
segments = np.zeros((250000,100,12))
segmentInd = 0
labels = list()
for i in range(len(y)):
    
    label = y[i]

    if i % 1000 == 1:
        print(i)
    for segment in peakSegmentation(X[i]):

        segments[segmentInd,:,:] = segment
        segmentInd += 1
        labels.append(label)


# Only save segments filled in
segments = np.asarray(segments).astype('float32')[0:segmentInd,:,:]

np.save("DataSegmented.npy", segments)
np.save("SegmentedLabels.npy", np.array(labels,dtype=object))
