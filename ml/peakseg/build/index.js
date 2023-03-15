"use strict";
exports.__esModule = true;
var fs = require("fs");
var csvstr = fs.readFileSync("../ECG.txt").toString();
var lines = csvstr.split('\n');
var nums = lines.map(function (line) { return line.substring(23, 36); }).map(function (str) { return Number(str); });
console.log(nums);
var outstr = "";
for (var _i = 0, nums_1 = nums; _i < nums_1.length; _i++) {
    var num = nums_1[_i];
    outstr += num + "\n";
}
fs.writeFileSync("../ECGbetter.txt", outstr);
