
/**
 * Finds the indices of the peaks in nums
 * Will exclude other close peaks
 * @param nums 
 * @param mindist 
 * @param threshpct 
 * @returns 
 */
function findMaximums(nums: number[], mindist: number, threshpct = 0.7) {
  let mean = 0;

  for (let i = 0; i < nums.length; i++) {
    mean += nums[i];
  }
  mean /= nums.length;

  // normalize around mean
  let normalized = nums.map(x => x - mean);



  // flip if more negative
  const normmax = Math.max(...normalized);
  const normmin = Math.min(...normalized);
  if (normmax < Math.abs(normmin)) {
    normalized = normalized.map(x => -x);
  }

  const globalmax = Math.max(...normalized);

  // find peaks in nums that are above thereshold
  let maxinds = [];
  for (let i = 1; i < normalized.length - 1; i++) {
    // check if above threshold
    if (normalized[i] > globalmax * threshpct) {
      // check for local max
      if (normalized[i] >= normalized[i - 1] && normalized[i] >= normalized[i + 1]) {
        maxinds.push(i);
      }
    }
  }

  console.log("possible", maxinds)

  if (maxinds.length > 0) {
    // sort localmaxinds by size
    maxinds.sort((a, b) => normalized[b] - normalized[a]);

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

    maxinds.sort((a, b) => a - b);
  }
  else {
    // no peaks found
    return [];
  }

  return maxinds;
}

/**
 * Segments the ECG values into individual beats, normalizes nums aroud mean before sumsampling
 * 
 * @param nums ECG values 
 * @param mindist minimum distance between peaks
 * @param threshpct threshold to be a peak
 * @returns array of beats
 */
export default function segmentHeartbeat(nums: number[], mindist: number, threshpct = 0.7) {

  const maxinds = findMaximums(nums, mindist, threshpct);

  console.log(maxinds)

  // normalize nums from 0 to 1
  const min = Math.min(...nums);
  let normalized = nums.map(x => x - min);
  const max = Math.max(...normalized);
  normalized = normalized.map(x => x / max);

  // segment based on beats

  const beats: number[][] = [];
  const ranges: number[] = [];
  for (let i = 1; i < maxinds.length - 1; i++) {
    const diff = maxinds[i + 1] - maxinds[i - 1];
    const start = Math.round(maxinds[i] - diff / 4);
    const end = Math.round(maxinds[i] + diff / 4);
    ranges.push(start)
    ranges.push(end)

    const resampledBeat = subSample(normalized.slice(start, end), 100);
    beats.push(resampledBeat);
  }

  console.log(beats)

  return {
    beats: beats,
    ends: ranges
  };
}

/**
 * Simple array sub-sampling
 * @param arr input array
 * @param newSize desired size of the new array
 * @returns 
 */
function subSample(arr: number[], newSize: number): number[] {
  console.log(arr.length)
  const newArr = [];
  const sizeRatio = arr.length / newSize;
  for (let i = 0; i < newSize; i++) {
    newArr.push(arr[Math.round(i * sizeRatio)]);
  }
  return newArr
}
