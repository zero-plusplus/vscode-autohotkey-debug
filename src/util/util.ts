/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import { statSync } from 'fs';
import { URI } from 'vscode-uri';

export const isDirectory = (dirPath: string): boolean => {
  try {
    return statSync(dirPath).isDirectory();
  }
  catch {
  }
  return false;
};
export const isPrimitive = (value: any): value is string | number | boolean => {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
};
export const isNumberLike = (value: any): boolean => {
  if (typeof value === 'string') {
    if (value === '' || (/\s+/u).test(value)) {
      return false;
    }
    return Boolean(!isNaN(Number(value.trim())) || parseFloat(value.trim()));
  }
  if (typeof value === 'number') {
    return true;
  }
  return false;
};
export const isFloatLike = (value): boolean => {
  if (!isNumberLike(value)) {
    return false;
  }
  return String(value).includes('.');
};
export const isIntegerLike = (value: any): boolean => {
  if (isFloatLike(value)) {
    return false;
  }
  return !isNaN(Number(value)) && Number.isInteger(parseFloat(String(value)));
};
export const toArray = <T>(value: any): T[] => {
  return (Array.isArray(value) ? value : [ value ]) as T[];
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
export const now = (): string => {
  const now = new Date();
  const month = String(now.getMonth()).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliSeconds = String(now.getMilliseconds()).padStart(3, '0');
  return `${now.getFullYear()}/${month}/${date} ${hours}:${minutes}:${seconds}.${milliSeconds}`;
};

export const toFileUri = (file: string): string => {
  const isUncPath = file.startsWith('\\\\');
  if (isUncPath) {
    return file;
  }

  const isUri = file.startsWith('file:');
  if (isUri) {
    const isUncUri = (/^file:\/\/\/(?!\w%3A)/iu).test(file);
    if (isUncUri) {
      return `${file.replace(/^file:\/\/(\/)?/u, '')}`;
    }
    return file;
  }

  return URI.file(file).toString();
};
