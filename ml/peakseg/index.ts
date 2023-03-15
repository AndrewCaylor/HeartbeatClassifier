import * as fs from 'fs';

let csvstr = fs.readFileSync("./ECG.txt").toString();

let lines = csvstr.split('\n');

let nums = lines.map(line => line.substring(23, 36)).map(str => Number(str))
let threshpct = 0.5;
let mindist = 1000;


let globalmax = Math.max(...nums);

// find peaks in nums that are above thereshold
let maxinds = [];
for (let i = 1; i < nums.length - 1; i++) {
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
  maxinds.sort((a, b) => nums[b] - nums[a]);

  // remove peaks that are too close
  for (let i = 0; i < maxinds.length; i++) {
    let peakind = maxinds[i];
    // remove peaks that are too close
    for (let j = i + 1; j < maxinds.length; j++) {

      if (Math.abs(maxinds[j] - peakind) < mindist) {
        maxinds.splice(j, 1);
        j--;
      }
    }
  }
  maxinds.sort((a, b) => a-b);

  console.log(maxinds)
}
else {
  console.log("no peaks found")
}

const beats = [];
for (let i = 1; i < maxinds.length-1; i++) {
  const diff = maxinds[i+1] - maxinds[i-1];
  const start = Math.round(maxinds[i] - diff/4);
  const end = Math.round(maxinds[i] + diff/4);
  console.log(start,end)

  beats.push(subSample(nums.slice(start, end), 186));
}

function subSample(arr: number[], newSize: number) {
  const newArr = [];
  const sizeRatio = arr.length / newSize;
  for (let i = 0; i < newSize; i++) {
    newArr.push(arr[Math.round(i * sizeRatio)]);
  }
  return newArr;
}