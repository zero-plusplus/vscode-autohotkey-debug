export const toNumber = (value: any, defaultValue = -1): number => {
  const num = Number(value);
  if (isNaN(num)) {
    return defaultValue;
  }
  return num;
};
export const toSignedBinary = (value: string | number | bigint, bit = 64): string => {
  const isPositive = 0 <= Number(value);
  if (isPositive) {
    const binary = BigInt(value).toString(2).padStart(bit, '0');
    return binary;
  }

  const invert64bitMask = BigInt((2n ** 64n) + -1n);
  return BigInt(invert64bitMask + BigInt(value)).toString(2);
};
export const toSigned64BitBinary = (value: string | number | bigint): string => {
  return toSignedBinary(value, 64);
};
