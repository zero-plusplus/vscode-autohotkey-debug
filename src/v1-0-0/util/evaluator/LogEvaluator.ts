import * as dbgp from '../../dbgpSession';
import { maskQuotes } from '../ExpressionExtractor';
import { searchPair } from '../util';
import { EvaluatedObjectValue, EvaluatedPrimitiveValue, EvaluatedValue, ExpressionEvaluator, ExpressionEvaluatorConfig } from './ExpressionEvaluator';
import { copatibleFunctions_for_v1, copatibleFunctions_for_v2, formatSpecifiers_v1, formatSpecifiers_v2 } from './functions';
import { LogParser, LogPrefixData } from './LogParser';

export type LogData = PrimitiveLogData | ObjectLogData;
export interface LogDataBase {
  prefixes: LogPrefixData[];
}
export interface PrimitiveLogData extends LogDataBase {
  type: 'primitive';
  value: EvaluatedPrimitiveValue;
}
export interface ObjectLogData extends LogDataBase {
  type: 'object';
  label: string;
  value: EvaluatedObjectValue[];
}

export class LogEvaluator {
  public readonly expressionEvaluator: ExpressionEvaluator;
  private readonly parser: LogParser;
  constructor(session: dbgp.Session, config?: Omit<ExpressionEvaluatorConfig, 'functionMap' | 'enableFormatSpecifiers'>) {
    const functionMap = 2 <= session.ahkVersion.mejor
      ? copatibleFunctions_for_v1
      : copatibleFunctions_for_v2;
    const formatSpecifiers = 2.0 <= session.ahkVersion.mejor
      ? formatSpecifiers_v2
      : formatSpecifiers_v1;
    this.expressionEvaluator = new ExpressionEvaluator(session, { ...config, functionMap, formatSpecifiers });
    this.parser = new LogParser();
  }
  public async eval(text: string): Promise<LogData[]> {
    const parsedData = this.parser.parse(text);
    return (await Promise.all(parsedData.map(async(data): Promise<LogData[]> => {
      const values = await this.evalLogText(data.message);
      if (values.length === 0) {
        return [
          {
            type: 'primitive',
            prefixes: data.prefixes,
            value: '',
          },
        ];
      }

      let labelStack: string[] = [];
      let objectStack: EvaluatedObjectValue[] = [];
      const results: LogData[] = [];
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        const nextValue = values[i + 1];
        if (typeof value === 'object') {
          objectStack.push(value);
          if (typeof nextValue === 'object') {
            continue;
          }

          results.push({
            type: 'object',
            prefixes: data.prefixes,
            label: labelStack.join(''),
            value: objectStack.slice(),
          });
          labelStack = [];
          objectStack = [];
          continue;
        }

        labelStack.push(String(value ?? ''));
      }

      if (0 < labelStack.length) {
        results.push({
          type: 'primitive',
          prefixes: data.prefixes,
          value: labelStack.join(''),
        });
        labelStack = [];
      }

      return results;
    }))).flat();
  }
  private async evalLogText(text: string): Promise<EvaluatedValue[]> {
    const chars = text.split('');

    const results: EvaluatedValue[] = [];
    let current = '';
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      switch (char) {
        case '{': {
          if (current !== '') {
            results.push(current);
            current = '';
          }

          const afterText = text.slice(i);
          const maskedAfterText = maskQuotes(this.expressionEvaluator.ahkVersion, afterText);
          const pairIndex = searchPair(maskedAfterText, '{', '}');
          if (pairIndex === -1) {
            current += afterText;
            break;
          }
          const expression = afterText.slice(1, pairIndex); // {expression} -> expression
          // eslint-disable-next-line no-await-in-loop
          const evalutedValue = await this.expressionEvaluator.eval(expression);
          if (evalutedValue !== undefined) {
            results.push(evalutedValue);
          }

          i += pairIndex;
          break;
        }
        default: {
          current += char;
          break;
        }
      }
    }

    if (current !== '') {
      results.push(current);
    }
    return results;
  }
}
