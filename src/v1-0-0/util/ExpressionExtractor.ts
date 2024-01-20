import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';

export type AccessOperator = '' | '.' | '[' | '["' | `['`;

export interface ExpressionExtractorData {
  data: string;
  object: string;
  snippet: string;
  operator: AccessOperator;
  isStringMode: boolean;
}

export const maskQuotes = (version: AhkVersion, text: string): string => {
  const mask = (str: string): string => '*'.repeat(str.length);
  return 2 <= version.mejor
    ? text.replaceAll(/(?<!`)".*?(?<!`)"/gu, mask).replaceAll(/(?<!`)'.*?(?<!`)'/gu, mask)
    : text.replaceAll(/(?<!")".*?(?<!")"/gu, mask);
};

export class ExpressionExtractor {
  private readonly version: AhkVersion;
  constructor(ahkVersion: AhkVersion) {
    this.version = ahkVersion;
  }
  public extract(text: string): ExpressionExtractorData {
    const targetText = this.getTargetText(text);
    const isV2 = 2 <= this.version.mejor;

    // <Example>
    // abc.
    // abc.de
    const dotNotation_regex = isV2
      ? /\.(?<snippet>[a-zA-Z0-9_]*)$/u
      : /\.(?<snippet>[a-zA-Z0-9_$#@]*)$/u;
    if (dotNotation_regex.test(targetText)) {
      const snippet = targetText.match(dotNotation_regex)?.groups?.snippet ?? '';
      const object = this.trimAnotherExpression(targetText).replace(dotNotation_regex, '');
      return { data: `${object}.${snippet}`, object, snippet, operator: '.', isStringMode: false };
    }

    // <Example>
    // abc[
    // abc["def"][
    const bracket_regex = isV2 ? /(?<=[\]a-zA-Z0-9_])\[(?<snippet>\s*)$/u : /(?<=[\]a-zA-Z0-9_$#@])\[(?<snippet>\s*)$/u;
    if (bracket_regex.test(targetText)) {
      const snippet = targetText.match(bracket_regex)?.groups?.snippet ?? '';
      const object = this.trimAnotherExpression(targetText.replace(bracket_regex, ''));
      return { data: `${object}[${snippet}`, object, snippet, operator: '[', isStringMode: false };
    }

    // <Example>
    // abc["
    // abc.de["fg
    const bracketDoubleQuote_regex = isV2 ? /(?<=[\]a-zA-Z0-9_])\[\s*("(?<snippet>(`"|[^"])*))$/u : /(?<=[\]a-zA-Z0-9_$#@])\[\s*("(?<snippet>((?<=")"|[^"])*))$/u;
    if (bracketDoubleQuote_regex.test(targetText)) {
      const snippet = targetText.match(bracketDoubleQuote_regex)?.groups?.snippet ?? '';
      const object = this.trimAnotherExpression(targetText, 1).replace(bracketDoubleQuote_regex, '');
      return { data: `${object}["${snippet}`, object, snippet, operator: '["', isStringMode: false };
    }

    // <Example>
    // abc['
    // abc.de['fg
    const bracketSingleQuote_regex = /(?<=[\]a-zA-Z0-9_])\[\s*('(?<snippet>(`'|[^'])*))$/u;
    if (isV2 && bracketSingleQuote_regex.test(targetText)) {
      const snippet = targetText.match(bracketSingleQuote_regex)?.groups?.snippet ?? '';
      const object = this.trimAnotherExpression(targetText, 1).replace(bracketSingleQuote_regex, '');
      return { data: `${object}['${snippet}`, object, snippet, operator: `['`, isStringMode: false };
    }

    const data = this.trimAnotherExpression(targetText);
    // <Example>
    // "ab
    if (this.isStringMode(targetText)) {
      return { data, object: data, snippet: '', operator: '', isStringMode: true };
    }

    // <Example>
    // ab
    // abc.efg.hij
    // abc[def["
    // abc["def"]["hij"]["
    return { data, object: data, snippet: '', operator: '', isStringMode: false };
  }
  private isStringMode(targetText: string): boolean {
    const masked = maskQuotes(this.version, targetText);
    const quoteCount = Array(...masked.matchAll(2 <= this.version.mejor ? /"|'/gu : /"/gu)).length;
    return 0 < quoteCount;
  }
  private getTargetText(text: string): string {
    return (/\r\n|\n/u).test(text)
      ? text.split(/\r\n|\n/u).pop()!
      : text;
  }
  private trimAnotherExpression(targetText: string, initialBracketCount = 0): string {
    let trimStartIndex = -1;
    let bracketCount = initialBracketCount;
    let parenCount = 0;
    let braceCount = 0;

    const terminatorRegExp = 2 <= this.version.mejor ? /^[^a-zA-Z0-9_#@$.]$/u : /^[^a-zA-Z0-9_.]$/u;
    const chars = maskQuotes(this.version, targetText).split('');
    for (let i = chars.length - 1; 0 <= i; i--) {
      const char = chars[i];
      switch (char) {
        case ']': {
          if (![ '.', '[' ].includes(chars[i + 1])) {
            break;
          }
          bracketCount++;
          continue;
        }
        case '[': {
          if (bracketCount === 0) {
            break;
          }
          bracketCount--;
          continue;
        }
        case ')': {
          parenCount++;
          continue;
        }
        case '(': {
          parenCount--;
          continue;
        }
        case '}': {
          braceCount++;
          continue;
        }
        case '{': {
          braceCount--;
          continue;
        }
        default: break;
      }

      if ((braceCount === 0 && parenCount === 0 && bracketCount === 0) && terminatorRegExp.test(char)) {
        break;
      }
      trimStartIndex = i;
    }

    return -1 < trimStartIndex ? targetText.slice(trimStartIndex) : '';
  }
}
