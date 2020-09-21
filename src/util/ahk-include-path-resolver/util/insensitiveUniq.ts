export default (arr: string[]): string[] => {
  if (!Array.isArray(arr)) {
    throw new TypeError('array-unique expects an array.');
  }

  const len = arr.length;
  let i = -1;

  while (i++ < len) {
    let j = i + 1;

    for (; j < arr.length; ++j) {
      if (arr[i].toLowerCase() === arr[j].toLowerCase()) {
        arr.splice(j--, 1);
      }
    }
  }
  return arr;
};
