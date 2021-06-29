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
export const lastIndexOf = (str: string, searchText: string | RegExp, fromIndex?: number): number => {
  if (typeof searchText === 'string') {
    return str.lastIndexOf(searchText, fromIndex);
  }
  const fixedString = fromIndex ? str.substr(fromIndex) : str;
  const regexp = new RegExp(searchText.source, `${searchText.flags}g`);
  const result = [ ...fixedString.matchAll(regexp) ].pop();
  return result?.index ?? -1;
};
