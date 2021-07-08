/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export const isNumberLike = (value: any): boolean => {
  if (typeof value === 'string') {
    return value.trim() !== '' && !isNaN((value as any) - 0);
  }
  if (typeof value === 'number') {
    return true;
  }
  return false;
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
        (ahkVersion.mejor === 2 && char === '`' && nextChar === quote)
        || (ahkVersion.mejor === 1 && char === quote && nextChar === quote)
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
export class AhkVersion {
  public readonly full: string;
  public readonly mejor: number = 0;
  public readonly minor: number = 0;
  public readonly teeny: number = 0;
  public readonly patch: number = 0;
  public readonly alpha: number = 0;
  constructor(version: string) {
    const splitedVersion = version.split('.').map((part) => {
      const versionPart = parseInt(part, 10);
      if (isNaN(versionPart)) {
        return 0;
      }
      return versionPart;
    });

    this.full = version;
    this.mejor = splitedVersion[0];
    this.minor = splitedVersion[1];

    const alphaMatch = version.match(/-(?:a(\d+)|alpha)/u);
    if (alphaMatch) {
      this.alpha = typeof alphaMatch[1] === 'undefined' ? 0 : parseInt(alphaMatch[1], 10); // Note: AutoHotkey_H does not have the alpha code set. It is always `2.0-alpha`
    }
    else {
      this.teeny = splitedVersion[2] ?? 0;
      this.patch = splitedVersion[3] ?? 0;
    }
  }
  public static greaterThan(a: string, b: string): boolean {
    return new AhkVersion(a).greaterThan(b);
  }
  public static greaterThanEquals(a: string, b: string): boolean {
    return new AhkVersion(a).greaterThanEquals(b);
  }
  public static lessThan(a: string, b: string): boolean {
    return new AhkVersion(a).lessThan(b);
  }
  public static lessThanEquals(a: string, b: string): boolean {
    return new AhkVersion(a).lessThanEquals(b);
  }
  public greaterThan(version: string | AhkVersion): boolean {
    return this.compareByInequality(version, '>');
  }
  public greaterThanEquals(version: string | AhkVersion): boolean {
    return this.compareByInequality(version, '>=');
  }
  public lessThan(version: string | AhkVersion): boolean {
    return this.compareByInequality(version, '<');
  }
  public lessThanEquals(version: string | AhkVersion): boolean {
    return this.compareByInequality(version, '<=');
  }
  public toArray(): number[] {
    return [ this.mejor, this.minor, this.teeny, this.patch, this.alpha ];
  }
  private compareByInequality(version: string | AhkVersion, inequality: '<' | '<=' | '>' | '>='): boolean {
    const target = version instanceof AhkVersion ? version : new AhkVersion(version);
    const compare = {
      '<': (a: number, b: number): boolean => a < b,
      '<=': (a: number, b: number): boolean => a <= b,
      '>': (a: number, b: number): boolean => a > b,
      '>=': (a: number, b: number): boolean => a >= b,
    }[inequality];

    if (this.full === target.full) {
      return true;
    }

    const versionPartsA = this.toArray();
    const versionPartsB = target.toArray();
    for (let i = 0; i < versionPartsA.length; i++) {
      const a = versionPartsA[i];
      const b = versionPartsB[i];
      if (a === b) {
        continue;
      }
      return compare(a, b);
    }

    return false; // Never gonna here
  }
}
