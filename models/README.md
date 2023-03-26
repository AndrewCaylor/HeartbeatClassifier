# How to upload these models to AWS:

## Format the model to proper folder structure for AWS

### initial folder structure:
  Model-tom-sent-me/
    assets
    saved_model.pb
    variables
      variables.data-00000-of-00001
      variables.index

### final folder structure: (found in /exports)
  export/Servo/1/
      assets
      saved_model.pb
      variables
        variables.data-00000-of-00001
        variables.index

### make .tar.gz
tar -czvf awsmodel.tar.gz export

## AWS Configuration

### Add Model to S3:
put the awsmodel.tar.gz into an S3 bucket.  
This is where Sagemaker will access our trained model from.  

### Create model Model Config:
Creating the model config in AWS

#### Execution Role: 
This gives the required permissions for SageMaker to execute the model
Use this one: arn:aws:iam::158828455501:role/service-role/AmazonSageMaker-ExecutionRole-20221011T190872 

#### Inference Code Image:
Since we are not using our own server, AWS needs some way to know how to run our shit.  
Therefore docker is being used.  
Luckily, AWS provides some docker instances for us to use.  

Instance Link:
763104351884.dkr.ecr.us-east-1.amazonaws.com/tensorflow-inference:2.11-cpu

#### Model artifacts
This is the file that we added in the S3 bucket!  
Paste the S3 URI of the file in here.  
Ex: s3://heartmonitor-models/awsmodel.tar.gz  


### Create Endpoint Configuration:

#### Type of Endpoint
Choose "serverless"   

#### Variants
Create a new PRODUCTION variant.  
Choose the model that you just created.  
Set a Max Concurrency of 1.  

### Endpoint:
Now that the model is configured, not its time to set up the endpoint our backend will call.  

Create a new endpoint with the endpoint configuration that we just created.