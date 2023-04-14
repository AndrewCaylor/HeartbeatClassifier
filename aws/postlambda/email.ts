export default function getEmailParams(destEmail: string, patientID: string, startTime: string) {
  const accessLink = createAccessLink(patientID, startTime);
  const emailParams = {
    Destination: { /* required */
      CcAddresses: [],
      ToAddresses: [
        destEmail,
      ]
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `Access Link: ${accessLink}`
        },
        Text: {
          Charset: "UTF-8",
          Data: "TEXT_FORMAT_BODY"
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `New Heartbeat Recording for patientID: ${patientID}!`
      }
    },
    // can't use other sources yet, need to verify email with AWS
    Source: 'andrewc01@vt.edu',
  };
  return emailParams;
}

function createAccessLink(patientID: string, startTime: string) {
  const baseURL = "https://75xtipvj56.execute-api.us-east-1.amazonaws.com";
  return `${baseURL}/index.html?patientID=${patientID}&startTime=${startTime}&password=gokies`;
}