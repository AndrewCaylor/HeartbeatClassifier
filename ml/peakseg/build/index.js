"use strict";
exports.__esModule = true;
var fs = require("fs");
var csvstr = fs.readFileSync("./ECG.txt").toString();
var lines = csvstr.split('\n');
var nums = lines.map(function (line) { return line.substring(23, 36); }).map(function (str) { return Number(str); });
var threshpct = 0.5;
var mindist = 1000;
var globalmax = Math.max.apply(Math, nums);
// find peaks in nums that are above thereshold
var maxinds = [];
for (var i = 1; i < nums.length - 1; i++) {
    // check for local max
    if (nums[i] > nums[i - 1] && nums[i] > nums[i + 1]) {
        // check if above threshold
        if (nums[i] > globalmax * threshpct) {
            maxinds.push(i);
        }
    }
}
if (maxinds.length > 0) {
    // sort localmaxinds by size
    maxinds.sort(function (a, b) { return nums[b] - nums[a]; });
    // remove peaks that are too close
    for (var i = 0; i < maxinds.length; i++) {
        var peakind = maxinds[i];
        // remove peaks that are too close
        for (var j = i + 1; j < maxinds.length; j++) {
            if (Math.abs(maxinds[j] - peakind) < mindist) {
                maxinds.splice(j, 1);
                j--;
            }
        }
    }
    maxinds.sort(function (a, b) { return a - b; });
    console.log(maxinds);
}
else {
    console.log("no peaks found");
}
var beats = [];
for (var i = 1; i < maxinds.length - 1; i++) {
    var diff = maxinds[i + 1] - maxinds[i - 1];
    var start = Math.round(maxinds[i] - diff / 4);
    var end = Math.round(maxinds[i] + diff / 4);
    console.log(start, end);
    beats.push(subSample(nums.slice(start, end), 186));
}
console.log(beats);
function subSample(arr, newSize) {
    var newArr = [];
    var sizeRatio = arr.length / newSize;
    for (var i = 0; i < newSize; i++) {
        newArr.push(arr[Math.round(i * sizeRatio)]);
    }
    return newArr;
}
