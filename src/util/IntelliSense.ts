import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import * as dbgp from '../dbgpSession';
import { CaseInsensitiveMap } from './CaseInsensitiveMap';
import { ExpressionEvaluator, fetchPropertyChildren, getContexts } from './evaluator/ExpressionEvaluator';

export class IntelliSense {
  private readonly evaluator: ExpressionEvaluator;
  private readonly version: AhkVersion;
  constructor(session: dbgp.Session) {
    this.evaluator = new ExpressionEvaluator(session, undefined, false);
    this.version = this.evaluator.session.ahkVersion;
  }
  public async getSuggestion(text: string): Promise<dbgp.Property[]> {
    const targetText = this.getTargetText(text);
    const isV2 = 2 <= this.version.mejor;

    const dotNotation_regex = isV2
      ? /\.(?<snippet>[a-zA-Z0-9_]*)$/u
      : /\.(?<snippet>[a-zA-Z0-9_$#@]*)$/u;
    if (dotNotation_regex.test(targetText)) {
      const snippet = targetText.match(dotNotation_regex)?.groups?.snippet;
      const properties = await this.searchProperties(targetText.replace(dotNotation_regex, ''));
      if (!snippet) {
        return properties;
      }
      return properties.filter((property) => property.name.toLowerCase().startsWith(snippet.toLowerCase()));
    }

    const bracketDoubleQuote_regex = isV2 ? /(?<=\])\[\s*("(?<snippet>(`"|[^"])*))$/u : /(?<=\])\[\s*("(?<snippet>(""|[^"])*))$/u;
    if (bracketDoubleQuote_regex.test(targetText)) {
      const snippet = targetText.match(bracketDoubleQuote_regex)?.groups?.snippet;
      const properties = await this.searchProperties(targetText.replace(bracketDoubleQuote_regex, ''));
      if (!snippet) {
        return properties;
      }
      return properties.filter((property) => property.name.toLowerCase().startsWith(snippet.toLowerCase()));
    }

    const bracketSingleQuote_regex = /(?<=\])\[\s*("(?<snippet>(`'|[^'])*))$/u;
    if (isV2 && bracketSingleQuote_regex.test(targetText)) {
      const snippet = targetText.match(bracketSingleQuote_regex)?.groups?.snippet;
      const properties = await this.getSuggestion(targetText.replace(bracketSingleQuote_regex, ''));
      if (!snippet) {
        return properties;
      }
      return properties.filter((property) => property.name.toLowerCase().startsWith(snippet.toLowerCase()));
    }

    if (this.isStringMode(targetText)) {
      return [];
    }

    const openBrackets = Array(...targetText.matchAll(/\[/gu));
    const closeBrackets = Array(...targetText.matchAll(/\]/gu));
    if (openBrackets.length === 0 && closeBrackets.length === 0) {
      const lastMatch = Array(...targetText.matchAll(/\s/gu)).pop();
      if (lastMatch?.index) {
        const expression = targetText.slice(lastMatch.index + 1);
        return this.searchProperties(expression);
      }
      return this.searchProperties(targetText);
    }

    let bracketCount = 0;
    let expression = '';
    const chars = targetText.split('');
    for (let i = chars.length; 0 < i; i++) {
      const char = chars[i];
      if (char === ']') {
        bracketCount++;
        continue;
      }
      else if (char === '[') {
        bracketCount--;
        continue;
      }
      if (bracketCount === 0 && (/\s/u).test(char)) {
        break;
      }
      expression += char;
    }
    return this.searchProperties(expression);
  }
  private isStringMode(targetText: string): boolean {
    const isV2 = 2 <= this.version.mejor;

    const mask = (str: string): string => '*'.repeat(str.length);
    const masked = isV2
      ? targetText.replaceAll(/(?<!`)".*?(?<!`)"/gu, mask).replaceAll(/(?<!`)'.*?(?<!`)'/gu, mask)
      : targetText.replaceAll(/(?<!")".*?(?<!")"/gu, mask);

    const quoteCount = Array(...masked.matchAll(isV2 ? /"|'/gu : /"/gu)).length;
    return 0 < quoteCount;
  }
  private getTargetText(text: string): string {
    return (/\r\n|\n/u).test(text)
      ? text.split(/\r\n|\n/u).pop()!
      : text;
  }
  private async searchProperties(expression: string): Promise<dbgp.Property[]> {
    const value = await this.evaluator.eval(expression);
    if (value instanceof dbgp.ObjectProperty) {
      return await fetchPropertyChildren(this.evaluator.session, undefined, value) ?? [];
    }
    return this.fetchAllProperties();
  }
  private async fetchAllProperties(): Promise<dbgp.Property[]> {
    const session = this.evaluator.session;
    const contexts = await getContexts(session);
    if (!contexts) {
      return [];
    }

    const propertyMap = new CaseInsensitiveMap<string, dbgp.Property>();
    for await (const context of contexts) {
      const { properties } = await session.sendContextGetCommand(context);
      properties.forEach((property) => {
        if (propertyMap.has(property.fullName)) {
          return;
        }
        propertyMap.set(property.fullName, property);
      });
    }
    return Array.from(propertyMap.entries()).map(([ key, property ]) => property);
  }
}
