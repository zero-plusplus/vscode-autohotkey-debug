import * as dbgp from '../dbgpSession';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const isNumberLike = (value: any): boolean => {
  if (typeof value === 'string') {
    return value.trim() !== '' && !isNaN((value as any) - 0);
  }
  if (typeof value === 'number') {
    return true;
  }
  return false;
};
export const splitVariablePath = (ahkVersion: 1 | 2, variablePath: string): string[] => {
  const result: string[] = [];

  const chars = variablePath.split('');
  let part = '', quote: '' | '"' | '\'' = '', bracketCount = 0;
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
export const resolveVariablePath = async(session: dbgp.Session, variablePath: string): Promise<string> => {
  const resolvedVariablePathArray: string[] = [];
  for await (const pathPart of splitVariablePath(session.ahkVersion, variablePath)) {
    const isBracketNotationWithVariable = (): boolean => (session.ahkVersion === 2 ? /^\[(?!"|')/u : /^\[(?!")/u).test(pathPart);

    let resolvedPathPart = pathPart;
    if (isBracketNotationWithVariable()) {
      const _variablePath = pathPart.slice(1, -1);
      const property = await session.safeFetchLatestProperty(_variablePath);
      if (property instanceof dbgp.PrimitiveProperty) {
        const escapedValue = property.value.replace(/"/gu, session.ahkVersion === 2 ? '`"' : '""');
        resolvedPathPart = isNumberLike(escapedValue) ? `[${escapedValue}]` : `["${escapedValue}"]`;
      }
      else if (property instanceof dbgp.ObjectProperty) {
        resolvedPathPart = `[Object(${property.address})]`;
      }
    }
    resolvedVariablePathArray.push(resolvedPathPart);
  }
  return joinVariablePathArray(resolvedVariablePathArray);
};
