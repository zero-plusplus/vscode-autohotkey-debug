import * as P from 'parsimmon';
import { Session } from '../dbgpSession';
import * as createPcre from 'pcre-to-regexp';

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
  private readonly parser: P.Parser<any>;
  constructor(session: Session) {
    this.session = session;
    this.parser = this.createParser();
  }
  public async eval(expression: string): Promise<boolean> {
    const parsed = this.parser.parse(expression);
    if ('value' in parsed) {
      if (parsed.value.type === 'LogicalExpression') {
        const [ a, , operator, , b ] = parsed.value.value;
        const _a = a.type === 'PropertyName'
          ? await this.session.fetchPrimitiveProperty(a.value)
          : String(a.value);
        const _b = b.type === 'PropertyName'
          ? (await this.session.fetchPrimitiveProperty(b.value))?.replace('\\', '`')
          : String(b.value);

        if (_a && _b) {
          const _operator = operator.value;
          const result = Boolean(_operator(_a, _b));
          return result;
        }
      }
      else if (parsed.value.type === 'PropertyName') {
        const propertyName = parsed.value.value;
        const propertyValue = await this.session.fetchPrimitiveProperty(propertyName);
        if (propertyValue !== null) {
          return propertyValue !== '';
        }
      }
      else {
        const { value } = parsed.value;
        if (value === '0') {
          return false;
        }
        return value !== '';
      }
    }
    return false;
  }
  private createParser(): P.Parser<any> {
    const Lang = P.createLanguage({
      _(rules) {
        return P.regex(/\s*/u);
      },
      __(rules) {
        return P.whitespace;
      },
      Value(rules) {
        return P.alt(
          rules.Primitive,
          rules.PropertyName,
        );
      },
      Primitive(rules) {
        return P.alt(
          rules.StringLiteral,
          rules.NumberLiteral,
          rules.BooleanLiteral,
        ).map((result) => {
          return {
            type: 'Primitive',
            value: result,
          };
        });
      },
      StringLiteral(rules) {
        return P.seq(
          P.string('"'),
          P.regex(/(?:""|`"|[^`"])+/ui),
          P.string('"'),
        ).map((result) => result[1]);
      },
      NumberLiteral(rules) {
        return P.seq(
          P.alt(rules.NegativeOperator, P.string('')),
          P.alt(
            rules.HexLiteral,
            rules.FloatLiteral,
            rules.IntegerLiteral,
          ),
        ).map((result) => result.join(''));
      },
      NegativeOperator() {
        return P.string('-');
      },
      IntegerLiteral(rules) {
        return P.regex(/(?:[1-9][0-9]+|[0-9])/ui);
      },
      FloatLiteral(rules) {
        return P.seq(
          rules.IntegerLiteral,
          P.regex(/\.[0-9]+/ui),
        ).map((result) => result.join(''));
      },
      HexLiteral(rules) {
        return P.regex(/0x(?:[0-9a-f]|[1-9a-f][0-9a-f]+)/ui);
      },
      BooleanLiteral(rules) {
        return P.regex(/true|false/ui).map((result) => (result === 'true' ? '1' : '0'));
      },
      Identifer(rules) {
        return P.regex(/[^\s.!<>=]+/ui);
      },
      PropertyAccesor(rules) {
        return P.seq(
          P.string('.'),
          rules.Identifer,
        ).map((result) => result.join(''));
      },
      IndexAccesor(rules) {
        return P.seq(
          P.string('['),
          rules.Primitive,
          P.string(']'),
        ).map((result) => result.join(''));
      },
      PropertyName(rules) {
        return P.seq(
          rules.Identifer,
          P.alt(
            rules.PropertyAccesor,
            rules.IndexAccesor,
          ).many(),
        ).map((result) => {
          return {
            type: 'PropertyName',
            value: result.join(''),
          };
        });
      },
      Expression(rules) {
        return P.alt(
          rules.LogicalExpression,
          rules.Value,
        );
      },
      LogicalExpression(rules) {
        return P.seq(
          rules.Value,
          rules._,
          rules.Operator,
          rules._,
          rules.Value,
        ).map((result) => {
          return {
            type: 'LogicalExpression',
            value: result,
          };
        });
      },
      Operator(rules) {
        return P.alt(
          P.string('=='),
          P.string('='),
          P.string('!=='),
          P.string('!='),
          P.string('<='),
          P.string('<'),
          P.string('>='),
          P.string('>'),
          P.string('~='),
        ).map((result) => {
          return {
            type: 'Operator',
            value: operators[result],
          };
        });
      },
    });
    return Lang.Expression;
  }
}
