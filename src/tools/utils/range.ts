type CountCallback = (count: number) => void;
const loopCount = (count: number, callback: CountCallback): void => {
  for (let i = 0; i < count; i++) {
    callback(i);
  }
};
const loopBeginToEnd = (begin: number, end: number, callback: CountCallback): void => {
  const count = end - begin;
  if (count < 0) {
    throw new RangeError();
  }
  loopCount(count, (index) => {
    callback(index + begin);
  });
};

export class RangeError extends Error {
}
export const range = (first: number, last?: number, excludeEnd = false): number[] => {
  const rangeArray: number[] = [];
  if (last === undefined) {
    loopCount(first, (count) => {
      rangeArray.push(count);
    });
    return rangeArray;
  }

  loopBeginToEnd(first, last + (excludeEnd ? 0 : 1), (count) => {
    rangeArray.push(count);
  });
  return rangeArray;
};
