import * as createPcre from 'pcre-to-regexp';
import Parser from './AhkSimpleParser';
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
  constructor(session: Session) {
    this.session = session;
  }
  public async eval(expression: string): Promise<boolean> {
    const parsed = Parser.Expression.parse(expression);
    if ('value' in parsed) {
      let primitive;
      const expression = parsed.value.value;
      if (expression.type === 'LogicalExpression') {
        const [ a, , operatorType, , b ] = expression.value;
        const _a = a.type === 'PropertyName'
          ? await this.session.fetchPrimitiveProperty(a.value)
          : String(a.value);
        const _b = b.type === 'PropertyName'
          ? (await this.session.fetchPrimitiveProperty(b.value))?.replace('\\', '`')
          : String(b.value);

        if (_a && _b) {
          const operator = operators[operatorType.value];
          return operator(_a, _b);
        }
      }
      else if (expression.type === 'PropertyName') {
        const propertyName = expression.value;
        primitive = await this.session.fetchPrimitiveProperty(propertyName);
      }
      else if (expression.type === 'Primitive') {
        primitive = expression.value;
      }

      if (typeof primitive !== 'undefined') {
        if (primitive === '0') {
          return false;
        }
        return primitive !== '';
      }
    }
    return false;
  }
}
