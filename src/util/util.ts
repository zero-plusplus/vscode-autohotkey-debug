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
export const joinVariablePathArray = (pathArray: string[]): string => {
  return pathArray.map((part, i) => {
    if (0 < i) {
      return part.startsWith('[') ? part : `.${part}`;
    }
    return part;
  }).join('');
};
