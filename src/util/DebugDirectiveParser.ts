import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import { maskQuotes } from './ExpressionExtractor';
import { searchPair } from './util';

export const directiveNames = [
  'breakpoint',
  'output',
  'clearconsole',
] as const;
export type DebugDirectiveName = typeof directiveNames[number];
export interface DebugDirectiveParsedData {
  name: DebugDirectiveName;
  condition?: string;
  hitCondition?: string;
  message?: string;
}

export class DebugDirectiveParser {
  public readonly ahkVersion: AhkVersion;
  constructor(ahkVersion: AhkVersion) {
    this.ahkVersion = ahkVersion;
  }
  public parse(text: string): DebugDirectiveParsedData | undefined {
    const match = text.match(/^\s*(?<!;)\s*;\s*(@Debug-(?<type>[\w_]*))(\s*(,|\s)\s*|\s*$)/ui);
    if (match?.index === undefined) {
      return undefined;
    }

    const type = this.normalizeType(match.groups?.type);
    if (!type) {
      return undefined;
    }

    let condition: string | undefined;
    let hitCondition: string | undefined;
    let expression = text.slice(match.index + match[0].length);
    if ((/^\s*$/u).test(expression)) {
      return { name: type };
    }

    const parsedCondition = this.parseCondition(expression);
    if (parsedCondition) {
      condition = parsedCondition.condition;
      hitCondition = parsedCondition.hitCondition;
      expression = parsedCondition.expression;
    }

    const operatorMatch = expression.match(/^(?<operator>(?<!`)(-|=)(>)(\|)?)/u);
    const operator = operatorMatch?.groups?.operator ?? '';
    expression = expression.slice(operatorMatch?.index ? operatorMatch.index + operatorMatch[0].length : 0);
    switch (operator) {
      case '->': {
        expression = expression.slice('->'.length).trim();
        break;
      }
      case '->|': {
        expression = expression.slice('->|'.length).trimRight();
        break;
      }
      case '=>': {
        expression = `${expression.slice('=>'.length).trim()}\n`;
        break;
      }
      case '=>|': {
        expression = `${expression.slice('=>|'.length).trimRight()}\n`;
        break;
      }
      default: {
        if ((/^`(-|=)/u).test(expression)) {
          expression = expression.slice('`'.length);
        }
        expression = `${expression.trim()}\n`;
        break;
      }
    }
    return {
      name: type,
      condition,
      hitCondition,
      message: expression,
    };
  }
  private parseCondition(expression: string): { condition?: string; hitCondition?: string; expression: string } | undefined {
    let condition: string | undefined;
    let hitCondition: string | undefined;
    let currentExpression = expression.trimLeft();
    for (let i = 0, max = 2; i < max; i++) {
      if (currentExpression.startsWith('(')) {
        const masked = maskQuotes(this.ahkVersion, currentExpression);
        const index = searchPair(masked, '(', ')');
        if (-1 < index) {
          condition = currentExpression.slice(1, index).trim();
          currentExpression = currentExpression.slice(index + 1).trimLeft();
        }
      }
      else if (currentExpression.startsWith('[')) {
        const masked = maskQuotes(this.ahkVersion, currentExpression);
        const index = searchPair(masked, '[', ']');
        if (-1 < index) {
          hitCondition = currentExpression.slice(1, index).trim();
          currentExpression = currentExpression.slice(index + 1).trimLeft();
        }
      }
      currentExpression.trimLeft();
    }

    return {
      condition,
      hitCondition,
      expression: currentExpression,
    };
  }
  private normalizeType(type: string | undefined): DebugDirectiveName | undefined {
    if (!type) {
      return undefined;
    }

    const regexp = new RegExp(`${directiveNames.join('|')}`, 'ui');
    if (!regexp.test(type)) {
      return undefined;
    }

    return type.toLowerCase() as DebugDirectiveName;
  }
}
