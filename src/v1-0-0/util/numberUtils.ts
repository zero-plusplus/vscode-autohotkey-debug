export const toFixed = (number: number, precision: number): string => {
  if (Number.isInteger(number)) {
    return String(number);
  }

  const number_str = String(number);
  const afterPoint = number_str.slice(number_str.indexOf('.') + 1);

  const splited = afterPoint.split('');
  let newPrecision = 0;
  for (let i = 0; i < splited.length; i++) {
    if (splited[i] === '0') {
      continue;
    }

    newPrecision = i + precision;
    break;
  }
  return number.toFixed(newPrecision);
};
