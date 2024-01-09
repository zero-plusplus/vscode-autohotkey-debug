import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import * as dbgp from '../dap/dbgpSession';
import { CaseInsensitiveMap } from './CaseInsensitiveMap';
import { ExpressionEvaluator, fetchInheritedProperties, getContexts } from './evaluator/ExpressionEvaluator';
import { copatibleFunctions_for_v1, copatibleFunctions_for_v2 } from './evaluator/functions';
import { AccessOperator, ExpressionExtractor } from './ExpressionExtractor';

export type CompletionItemConverter<T> = (property: dbgp.Property, snippet: string, trigger: AccessOperator) => Promise<T>;
export type Position = { line: number; column: number };

export class IntelliSense {
  public readonly version: AhkVersion;
  public readonly evaluator: ExpressionEvaluator;
  public readonly expressionExtractor: ExpressionExtractor;
  constructor(session: dbgp.Session) {
    const functionMap = 2 <= session.ahkVersion.mejor
      ? copatibleFunctions_for_v2
      : copatibleFunctions_for_v1;
    this.evaluator = new ExpressionEvaluator(session, { functionMap });
    this.version = this.evaluator.session.ahkVersion;
    this.expressionExtractor = new ExpressionExtractor(this.version);
  }
  public async getSuggestion<T>(text: string, converter: CompletionItemConverter<T>): Promise<T[]> {
    const { object, isStringMode, operator, snippet } = this.expressionExtractor.extract(text);
    if (isStringMode) {
      return [];
    }

    // <Example>
    // abc[
    // abc["def"][
    if (operator === '[') {
      const properties = await this.searchProperties(object);
      if ((/^\s*$/u).test(snippet)) {
        return [
          ...(await this.convertItems(properties, snippet, '[', converter)),
          ...(await this.getSuggestion(snippet, converter)),
        ];
      }
      return this.getSuggestion(snippet, converter);
    }

    if (operator === '') {
      const properties = await this.fetchAllProperties();
      return this.convertItems(properties, snippet, operator, converter);
    }

    const properties = await this.searchProperties(object);
    return this.convertItems(properties, snippet, operator, converter);
  }
  private async searchProperties(expression: string): Promise<dbgp.Property[]> {
    if (expression === '') {
      return this.fetchAllProperties();
    }

    const value = await this.evaluator.eval(expression);
    if (value instanceof dbgp.ObjectProperty && value.hasChildren) {
      return fetchInheritedProperties(this.evaluator.session, undefined, value);
    }
    return [];
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
  private async convertItems<T>(properties: dbgp.Property[], snippet: string, trigger: AccessOperator, converter?: CompletionItemConverter<T>): Promise<T[]> {
    const isV2 = 2 <= this.version.mejor;
    const convertedItems = await Promise.all(properties.filter((property) => {
      if ((/^<(?!base)/u).test(property.name)) {
        return false;
      }
      if (property.name === '<enum>') {
        return false;
      }
      if ((/^\d+$/u).test(property.name)) {
        return false;
      }
      if (property.isIndexKey) {
        return false;
      }
      if (isV2 && trigger.startsWith('[') && !property.name.startsWith('[')) {
        return false;
      }

      const isIndexKeyByObject = (/[\w]+\(\d+\)/ui).test(property.name);
      if (isIndexKeyByObject) {
        return false;
      }
      return true;
    }).map(async(property) => (converter ? converter(property, snippet, trigger) : (property as T))));

    return convertedItems;
  }
}
