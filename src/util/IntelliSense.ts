import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import * as dbgp from '../dbgpSession';
import { CaseInsensitiveMap } from './CaseInsensitiveMap';
import { ExpressionEvaluator, fetchInheritedProperties, getContexts } from './evaluator/ExpressionEvaluator';

export type CompletionItemConverter<T> = (property: dbgp.Property, snippet: string, trigger: TriggerCharacter) => Promise<T>;
export type Position = { line: number; column: number };
export type TriggerCharacter = '' | '.' | '[' | '["' | `['`;

export const maskQuotes = (version: AhkVersion, text: string): string => {
  const mask = (str: string): string => '*'.repeat(str.length);
  return 2 <= version.mejor
    ? text.replaceAll(/(?<!`)".*?(?<!`)"/gu, mask).replaceAll(/(?<!`)'.*?(?<!`)'/gu, mask)
    : text.replaceAll(/(?<!")".*?(?<!")"/gu, mask);
};

export class IntelliSense {
  public readonly evaluator: ExpressionEvaluator;
  public readonly version: AhkVersion;
  constructor(session: dbgp.Session) {
    this.evaluator = new ExpressionEvaluator(session, undefined, false);
    this.version = this.evaluator.session.ahkVersion;
  }
  public async getSuggestion<T>(text: string, converter: CompletionItemConverter<T>): Promise<T[]> {
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
      const expression = this.trimAnotherExpression(targetText).replace(dotNotation_regex, '');
      const properties = await this.searchProperties(expression);
      return this.convertItems(properties, snippet, '.', converter);
    }

    // <Example>
    // abc[
    // abc["def"][
    const bracket_regex = isV2 ? /(?<=[\]a-zA-Z0-9_])\[(?<snippet>\s*)$/u : /(?<=[\]a-zA-Z0-9_$#@])\[(?<snippet>\s*)$/u;
    if (bracket_regex.test(targetText)) {
      const snippet = targetText.match(bracket_regex)?.groups?.snippet ?? '';
      const expression = this.trimAnotherExpression(targetText.replace(bracket_regex, ''));
      const properties = await this.searchProperties(expression);
      if ((/^\s*$/u).test(snippet)) {
        return [
          ...(await this.convertItems(properties, snippet, '[', converter)),
          ...(await this.getSuggestion(snippet, converter)),
        ];
      }
      return this.getSuggestion(snippet, converter);
    }

    // <Example>
    // abc["
    // abc.de["fg
    const bracketDoubleQuote_regex = isV2 ? /(?<=[\]a-zA-Z0-9_])\[\s*("(?<snippet>(`"|[^"])*))$/u : /(?<=[\]a-zA-Z0-9_$#@])\[\s*("(?<snippet>(""|[^"])*))$/u;
    if (bracketDoubleQuote_regex.test(targetText)) {
      const snippet = targetText.match(bracketDoubleQuote_regex)?.groups?.snippet ?? '';
      const properties = await this.searchProperties(targetText.replace(bracketDoubleQuote_regex, ''));
      return this.convertItems(properties, snippet, '["', converter);
    }

    // <Example>
    // abc['
    // abc.de['fg
    const bracketSingleQuote_regex = /(?<=[\]a-zA-Z0-9_])\[\s*("(?<snippet>(`'|[^'])*))$/u;
    if (isV2 && bracketSingleQuote_regex.test(targetText)) {
      const snippet = targetText.match(bracketSingleQuote_regex)?.groups?.snippet ?? '';
      const properties = await this.searchProperties(targetText.replace(bracketSingleQuote_regex, ''));
      return this.convertItems(properties, snippet, `['`, converter);
    }

    // <Example>
    // "ab
    if (this.isStringMode(targetText)) {
      return [];
    }

    // <Example>
    // ab
    // abc.efg.hij
    const openBrackets = Array(...targetText.matchAll(/\[/gu));
    const closeBrackets = Array(...targetText.matchAll(/\]/gu));
    if (openBrackets.length === 0 && closeBrackets.length === 0) {
      const expression = this.trimAnotherExpression(targetText);
      if (expression.includes('.')) {
        const properties = await this.searchProperties(expression);
        return this.convertItems(properties, '', '', converter);
      }
      const properties = await this.fetchAllProperties();
      return this.convertItems(properties, '', '', converter);
    }

    // <Example>
    // abc[def["
    // abc["def"]["hij"]["
    const expression = this.trimAnotherExpression(targetText);
    return this.getSuggestion(expression, converter);
    // const properties = await this.searchProperties(expression);
    // return this.convertItems(properties, '', '', converter);
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
  private trimAnotherExpression(targetText: string): string {
    let trimStartIndex = -1;
    let bracketCount = 0;

    const chars = maskQuotes(this.version, targetText).split('');
    for (let i = chars.length - 1; 0 <= i; i--) {
      const char = chars[i];
      if (char === ']') {
        if (![ '.', '[' ].includes(chars[i + 1])) {
          break;
        }
        bracketCount++;
        continue;
      }
      else if (char === '[') {
        if (bracketCount === 0) {
          break;
        }
        bracketCount--;
        continue;
      }

      if (bracketCount === 0 && (/\s/u).test(char)) {
        break;
      }
      trimStartIndex = i;
    }

    return -1 < trimStartIndex ? targetText.slice(trimStartIndex) : '';
  }
  private async searchProperties(expression: string): Promise<dbgp.Property[]> {
    if (expression === '') {
      return this.fetchAllProperties();
    }

    const value = await this.evaluator.eval(expression);
    if (value instanceof dbgp.ObjectProperty && value.hasChildren) {
      return fetchInheritedProperties(this.evaluator.session, undefined, value);
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
      const { properties } = await session.sendContextGetCommand(context, 0);
      properties.forEach((property) => {
        if (propertyMap.has(property.fullName)) {
          return;
        }
        propertyMap.set(property.fullName, property);
      });
    }
    return Array.from(propertyMap.entries()).map(([ key, property ]) => property);
  }
  private async convertItems<T>(properties: dbgp.Property[], snippet: string, trigger: TriggerCharacter, converter?: CompletionItemConverter<T>): Promise<T[]> {
    return Promise.all(properties.filter((property) => {
      if (property.name === '<enum>') {
        return false;
      }
      if ((/^\d+$/u).test(property.name)) {
        return false;
      }
      if (property.isIndexKey) {
        return false;
      }
      const isIndexKeyByObject = (/[\w]+\(\d+\)/ui).test(property.name);
      if (isIndexKeyByObject) {
        return false;
      }
      return true;
    }).map(async(property) => (converter ? converter(property, snippet, trigger) : (property as T))));
  }
}
