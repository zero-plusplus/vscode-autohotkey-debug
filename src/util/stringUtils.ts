export const equalsIgnoreCase = (a: string, b: string): boolean => {
  const _a = a.toLowerCase();
  const _b = b.toLowerCase();
  return _a === _b;
};
export const startsWithIgnoreCase = (str: string, prefix: string): boolean => {
  const _str = str.toLowerCase();
  const _preifx = prefix.toLowerCase();
  return _str.startsWith(_preifx);
};
