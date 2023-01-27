"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.handler = void 0;
var AWS = require("aws-sdk");
var buffer_1 = require("buffer");
AWS.config.update({ region: 'us-east-1' });
var s3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'us-east-1' });
var ses = new AWS.SES({ apiVersion: '2010-12-01' });
var lambda = new AWS.Lambda({ region: 'us-east-1' });
var sage = new AWS.SageMakerRuntime();
function getEmailParams(destEmail, patientID, startTime) {
    var accessLink = createAccessLink(patientID, startTime);
    var emailParams = {
        Destination: {
            CcAddresses: [],
            ToAddresses: [
                destEmail,
            ]
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: "Access Link: ".concat(accessLink)
                },
                Text: {
                    Charset: "UTF-8",
                    Data: "TEXT_FORMAT_BODY"
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: "New Heartbeat Recording for patientID: ".concat(patientID, "!")
            }
        },
        Source: 'andrewc01@vt.edu'
    };
    return emailParams;
}
function createAccessLink(patientID, startTime) {
    var baseURL = "https://75xtipvj56.execute-api.us-east-1.amazonaws.com";
    return "".concat(baseURL, "/index.html?patientID=").concat(patientID, "&startTime=").concat(startTime, "&password=gokies");
}
/**
 *
 * @param inputFeatures Input to the model: Array of 186 numbers
 * @returns Promise to JSON object of the response from SageMaker instance
 */
function invokeSage(inputFeatures) {
    if (inputFeatures.length != 186) {
        throw new Error("Input features must be an array of 186 numbers");
    }
    // need to format it like this or it wont work
    var featuresarr = [];
    for (var _i = 0, inputFeatures_1 = inputFeatures; _i < inputFeatures_1.length; _i++) {
        var feature = inputFeatures_1[_i];
        featuresarr.push([feature]);
    }
    var data = [featuresarr];
    var params = {
        Body: JSON.stringify(data),
        EndpointName: 'pleasework',
        ContentType: 'application/json',
        Accept: 'application/json'
    };
    return sage.invokeEndpoint(params).promise().then(function (data) {
        console.log(data);
        return JSON.parse(data.Body.toString());
    });
}
function buffToFloat32(buff) {
    // reads each of the 4 byte floats from the buffer
    var float32 = new Float32Array(buff.byteLength / 4);
    for (var i = 0; i < float32.length; i++) {
        float32[i] = buff.readFloatLE(i * 4);
    }
    return float32;
}
var handler = function (event, context) { return __awaiter(void 0, void 0, void 0, function () {
    var bodyBuff, bodyStr, body, audioBuf, ecgBuf, ecgFloat32, ecgCsv, sesParams, emailRes, audRes, ecgRes, metadata, metaRes, ecgArr, predRes, results, response;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                bodyBuff = buffer_1.Buffer.from(event.body, 'base64');
                bodyStr = bodyBuff.toString('utf8');
                body = JSON.parse(bodyStr);
                audioBuf = buffer_1.Buffer.from(body.audio, 'base64');
                ecgBuf = buffer_1.Buffer.from(body.ecg, 'base64');
                ecgFloat32 = buffToFloat32(ecgBuf);
                ecgCsv = ecgFloat32.join('\n');
                sesParams = getEmailParams(body.destEmail, body.patientID, body.startTime.toString());
                emailRes = ses.sendEmail(sesParams).promise();
                audRes = s3.putObject({
                    Bucket: "heartmonitor-audiotest",
                    Key: "".concat(body.patientID).concat(body.startTime, "AUDIO.wav"),
                    Body: audioBuf,
                    ContentType: "audio/x-wav"
                }).promise();
                ecgRes = s3.putObject({
                    Bucket: "heartmonitor-audiotest",
                    Key: "".concat(body.patientID).concat(body.startTime, "ECG.csv"),
                    Body: ecgCsv,
                    ContentType: "text/csv"
                }).promise();
                metadata = {
                    patientID: body.patientID,
                    startTime: body.startTime,
                    destEmail: body.destEmail
                };
                metaRes = s3.putObject({
                    Bucket: "heartmonitor-audiotest",
                    Key: "".concat(body.patientID).concat(body.startTime, "META.json"),
                    Body: JSON.stringify(metadata),
                    ContentType: "binary/octet-stream"
                }).promise();
                ecgArr = Array.prototype.slice.call(ecgFloat32);
                console.log(ecgArr);
                predRes = invokeSage(ecgArr);
                return [4 /*yield*/, Promise.all([emailRes, audRes, ecgRes, metaRes, predRes])];
            case 1:
                results = _a.sent();
                response = {
                    statusCode: 200,
                    headers: {},
                    body: JSON.stringify(results[4])
                };
                return [2 /*return*/, response];
        }
    });
}); };
exports.handler = handler;
