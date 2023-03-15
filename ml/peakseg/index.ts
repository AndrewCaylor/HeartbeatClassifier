import * as fs from 'fs';

let csvstr = fs.readFileSync("./ECG.txt").toString();

let lines = csvstr.split('\n');

let nums = lines.map(line => line.substring(23,36)).map(str => Number(str))

console.log(nums)
let outstr = "";
for (let num of nums){
    outstr += num + "\n"
}

fs.writeFileSync("../ECGbetter.txt", outstr)