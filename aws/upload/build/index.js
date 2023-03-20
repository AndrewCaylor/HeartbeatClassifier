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
var axios_1 = require("axios");
var fs = require("fs");
var AWS = require("aws-sdk");
var buffer_1 = require("buffer");
AWS.config.update({ region: 'us-east-1' });
var sage = new AWS.SageMakerRuntime();
var AuscultationPt;
(function (AuscultationPt) {
    AuscultationPt["aortic"] = "aortic";
    AuscultationPt["mitral"] = "mitral";
    AuscultationPt["tricuspid"] = "tricuspid";
    AuscultationPt["pulmonic"] = "pulmonic";
    AuscultationPt["unknown"] = "unknown";
})(AuscultationPt || (AuscultationPt = {}));
/**
 * @param CSV CSV file with foating point numbers
 * @returns Float32 Buffer
 */
function CSVFiletoFloat32Buffer(CSV) {
    // get the string from the file buffer
    var decoder = new TextDecoder();
    var str = decoder.decode(CSV);
    // convert the string to a series of numbers
    var ecgNums = str.split('\n').map(Number);
    // create a float32 buffer
    var float32 = new Float32Array(ecgNums);
    var float32Buffer = buffer_1.Buffer.from(float32.buffer);
    return float32Buffer;
}
/**
 * Uploads the ECG and audio files to the server
 * The server will then process the data and send an email
 * with the access link to the results to destEmail
 *
 * @param audioData WAV audio Buffer
 * @param ecgData Float32 Buffer
 * @param patientID This can be any string
 * @param email Email to send access link to
 * @param apiKey Must be gokies, this is temporary security
 * @returns Response from API
 */
function upload(audioData, ecgData, patientID, email, apiKey) {
    return __awaiter(this, void 0, void 0, function () {
        var axios, uploadParams, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    axios = new axios_1.Axios({
                        baseURL: 'https://75xtipvj56.execute-api.us-east-1.amazonaws.com'
                    });
                    uploadParams = {
                        audio: audioData.toString('base64'),
                        ecg: ecgData.toString('base64'),
                        patientID: patientID,
                        destEmail: email,
                        startTime: 1678929332854,
                        password: apiKey,
                        sampleRate: 1600,
                        stethoscopeLocation: AuscultationPt.mitral,
                        sendEmail: true
                    };
                    console.log(uploadParams);
                    return [4 /*yield*/, axios.post("/upload", JSON.stringify(uploadParams), {})];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response];
            }
        });
    });
}
function DoUploadDemo() {
    return __awaiter(this, void 0, void 0, function () {
        var audioFile, csvstr, lines, line, float32, float32Buffer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.readFileSync('./metronome80.wav')];
                case 1:
                    audioFile = _a.sent();
                    csvstr = fs.readFileSync("./ecg_out_low_0.txt").toString();
                    lines = csvstr.split('\n');
                    line = lines.map(function (str) { return Number(str); });
                    console.log(line[0]);
                    float32 = new Float32Array(line);
                    float32Buffer = buffer_1.Buffer.from(float32.buffer);
                    // const float32ECGBuffer = CSVFiletoFloat32Buffer(ecgFile);
                    return [2 /*return*/, upload(audioFile, float32Buffer, 'drew', 'andrewc01@vt.edu', 'gokies')];
            }
        });
    });
}
/**
 *
 * @param arr array of numbers: 1 row, n col
 * @returns n rows, 1 col
 */
function formatArr(arr) {
    var newArr = [];
    for (var i = 0; i < arr.length; i++) {
        newArr.push([arr[i]]);
    }
    return newArr;
}
/**
 *
 * @param beats array of beats. Each beat is an array of numbers
 * @returns JSON object of the response from SageMaker instance
 */
function invokeSage(beats) {
    return __awaiter(this, void 0, void 0, function () {
        var data, _i, beats_1, beat, formattedBeat, params;
        return __generator(this, function (_a) {
            data = [];
            for (_i = 0, beats_1 = beats; _i < beats_1.length; _i++) {
                beat = beats_1[_i];
                formattedBeat = formatArr(beat.slice(0, 186));
                data.push(formattedBeat);
            }
            params = {
                Body: JSON.stringify(data),
                EndpointName: 'pleasework4',
                ContentType: 'application/json',
                Accept: 'application/json'
            };
            console.log("Invoking SageMaker endpoint");
            return [2 /*return*/, sage.invokeEndpoint(params).promise().then(function (data) {
                    return JSON.parse(data.Body.toString());
                })];
        });
    });
}
function invokeSageDemo() {
    return __awaiter(this, void 0, void 0, function () {
        var ecgFile, lines, beats, i, line;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.readFileSync('./../../ml/dataset/archive/mitbih_test.csv')];
                case 1:
                    ecgFile = _a.sent();
                    lines = ecgFile.toString().split('\n');
                    beats = [];
                    for (i = 0; i < 10; i++) {
                        line = lines[i].split(',').map(Number);
                        beats.push(line);
                    }
                    return [2 /*return*/, invokeSage(beats)];
            }
        });
    });
}
var start = Date.now();
DoUploadDemo().then(function (res) {
    console.log(res);
    var end = Date.now();
    console.log("Time: ".concat(end - start, " ms"));
});
// const start = Date.now()
// invokeSageDemo().then((data)=>{
//   console.log(data)
//   const end = Date.now();
//   console.log(`Time: ${end - start} ms`);
// }).catch((err) => {
//   console.log(err);
// });
