/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';


export const isNumberLike = (value: any): boolean => {
  if (typeof value === 'string') {
    return value.trim() !== '' && !isNaN((value as any) - 0);
  }
  if (typeof value === 'number') {
    return true;
  }
  return false;
};
export const timeoutPromise = async<T>(promise: Promise<T>, timeout: number): Promise<T | void> => {
  return Promise.race([
    promise, new Promise<void>((resolve, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error('timeout'));
      }, timeout);
    }),
  ]);
};
export const splitVariablePath = (ahkVersion: AhkVersion, variablePath: string): string[] => {
  const result: string[] = [];

  const chars = variablePath.split('');
  let part = '', quote: '' | '"' | '\'' = '', bracketCount = 0;
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const prevChar = chars[i - 1] as string | undefined;
    const nextChar = chars[i + 1] as string | undefined;
    // const isIdentifierChar = (): boolean => (ahkVersion === 1 ? /^[\w_@#$]$/u : /^[\w_]$/u).test(char);

    if (quote) {
      part += char;
      const isEscapeQuote = (
        (2 <= ahkVersion.mejor && char === '`' && nextChar === quote)
        || (ahkVersion.mejor <= 1.1 && char === quote && nextChar === quote)
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
    else if (0 < bracketCount && char === ']') {
      part += char;
      if (bracketCount === 1) {
        result.push(part);
        part = '';
      }

      bracketCount--;
      continue;
    }
    else if (0 < bracketCount && char === '.') {
      part += char;
      continue;
    }

    switch (char) {
      case `'`: {
        if (ahkVersion.mejor === 2) {
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
        if (part || prevChar === '.') {
          result.push(part);
          part = '';
        }
        continue;
      }
      case '[': {
        if (bracketCount === 0 && part) {
          result.push(part);
          part = '';
        }

        part += char;
        bracketCount++;
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
  const lastChar = chars[chars.length - 1];
  if (lastChar === '.') {
    result.push('');
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
