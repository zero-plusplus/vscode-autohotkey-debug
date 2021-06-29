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
export const splitVariablePath = (ahkVersion: 1 | 2, variablePath: string): string[] => {
  const result: string[] = [];

  const chars = variablePath.split('');
  let part = '', quote: '' | '"' | '\'' = '', bracket: '' | '[' = '';
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    // const prevChar = chars[i - 1] as string | undefined;
    const nextChar = chars[i + 1] as string | undefined;
    // const isIdentifierChar = (): boolean => (ahkVersion === 1 ? /^[\w_@#$]$/u : /^[\w_]$/u).test(char);

    if (quote) {
      part += char;
      const isEscapeQuote = (
        (ahkVersion === 2 && char === '`' && nextChar === quote)
        || (ahkVersion === 1 && char === quote && nextChar === quote)
      );
      if (isEscapeQuote) {
        part += nextChar;
        i++;
        continue;
      }

      if (char === quote) {
        quote = '';
        continue;
      }
      continue;
    }
    else if (bracket && char === ']') {
      part += char;
      bracket = '';
      continue;
    }

    switch (char) {
      case `'`: {
        if (ahkVersion === 2) {
          quote = char;
          part += char;
          continue;
        }
        part += char;
        continue;
      }
      case '"': {
        quote = char;
        part += char;
        continue;
      }
      case '.': {
        result.push(part);
        part = '';

        if (!nextChar) {
          result.push('');
        }
        continue;
      }
      case '[': {
        result.push(part);

        part = char;
        bracket = char;
        continue;
      }
      default: {
        part += char;
        continue;
      }
    }
  }
  if (part !== '') {
    result.push(part);
  }
  return result;
};
