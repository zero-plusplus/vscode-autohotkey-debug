import * as createPcre from 'pcre-to-regexp';
import { Parser, createParser } from './ConditionParser';
import { Session } from '../dbgpSession';

type Operator = (a: string, b: string) => boolean;
const not = (predicate): Operator => (a: string, b: string): boolean => !predicate(a, b);
const equalsIgnoreCase: Operator = (a, b) => a.toLowerCase() === b.toLocaleLowerCase();
const equals: Operator = (a, b) => a === b;
const inequality = (sign: string): Operator => {
  return (a, b): boolean => {
    const _a = parseInt(a, 10);
    const _b = parseInt(b, 10);
    if (Number.isNaN(_a) || Number.isNaN(_b)) {
      return false;
    }

    if (sign === '<') {
      return _a < _b;
    }
    if (sign === '<=') {
      return _a <= _b;
    }
    if (sign === '>') {
      return _a > _b;
    }
    if (sign === '>=') {
      return _a >= _b;
    }
    return false;
  };
};
const ahkRegexToJsRegex = function(ahkRegex): RegExp {
  const match = ahkRegex.match(/(?<flags>.+)\)(?<pattern>.+)/ui);
  let flags: string, pattern: string;
  if (match?.groups) {
    flags = match.groups.flags;
    pattern = match.groups.pattern;
  }
  else {
    flags = '';
    pattern = ahkRegex;
  }

  return createPcre(`%${pattern}%${flags}`);
};
const regexCompare: Operator = function(input, ahkRegex) {
  const regex = ahkRegexToJsRegex(ahkRegex);
  return regex.test(input);
};
const operators: { [key: string]: Operator} = {
  '=': equalsIgnoreCase,
  '==': equals,
  '!=': not(equalsIgnoreCase),
  '!==': not(equals),
  '~=': regexCompare,
  '<': inequality('<'),
  '<=': inequality('<='),
  '>': inequality('>'),
  '>=': inequality('>='),
};

export class ConditionalEvaluator {
  private readonly session: Session;
  private readonly parser: Parser;
  constructor(session: Session, version: 1 | 2) {
    this.session = session;
    this.parser = createParser(version);
  }
  public async eval(expression: string): Promise<boolean> {
    const parsed = this.parser.Expression.parse(expression);
    if ('value' in parsed) {
      const expression = parsed.value.value;

      let primitiveValue;
      if (expression.type === 'LogicalExpression') {
        const [ a, , operatorType, , b ] = expression.value;
        const getValue = async(value): Promise<string | null> => {
          if (value.type === 'PropertyName') {
            const propertyName = value.value;
            const property = await this.session.fetchPrimitiveProperty(propertyName);
            return property;
          }

          const primitive = value.value;
          if (primitive.type === 'String') {
            return String(primitive.value);
          }

          const number = primitive.value;
          if (number.type === 'Hex') {
            return String(parseInt(number.value, 16));
          }
          return String(number.value);
        };
        const _a = await getValue(a);
        const _b = await getValue(b);

        if (_a !== null && _b !== null) {
          const operator = operators[operatorType.value];
          return operator(_a, _b);
        }
      }
      else if (expression.type === 'PropertyName') {
        const propertyName = expression.value;
        primitiveValue = await this.session.fetchPrimitiveProperty(propertyName);
      }
      else if (expression.type === 'Primitive') {
        const primitive = expression.value;
        primitiveValue = primitive.value;
      }

      if (typeof primitiveValue === 'string') {
        if (primitiveValue === '0') {
          return false;
        }
        return primitiveValue !== '';
      }
    }
    return false;
  }
}
