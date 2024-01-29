export const toNumber = (value: any, defaultValue = -1): number => {
  const num = Number(value);
  if (isNaN(num)) {
    return defaultValue;
  }
  return num;
};
