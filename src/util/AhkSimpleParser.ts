import * as P from 'parsimmon';

export type Parser = P.Language;
export const createParser = function(version: 1 | 2): P.Language {
  return P.createLanguage({
    _(rules) {
      return P.regex(/\s*/u);
    },
    __(rules) {
      return P.whitespace;
    },
    StringLiteral(rules) {
      return P.seq(
        P.string('"'),
        P.regex(/(?:""|`"|[^`"])*/ui),
        P.string('"'),
      ).map((result) => {
        return {
          type: 'String',
          value: result[1],
        };
      });
    },
    NumberLiteral(rules) {
      return P.alt(
        rules.ScientificLiteral,
        rules.HexLiteral,
        rules.FloatLiteral,
        rules.IntegerLiteral,
      ).map((result) => {
        return {
          type: 'Number',
          value: result,
        };
      });
    },
    NegativeOperator() {
      return P.string('-');
    },
    IntegerLiteral(rules) {
      return P.seq(
        P.alt(rules.NegativeOperator, P.string('')),
        P.regex(/(?:[1-9][0-9]+|[0-9])/ui),
      ).map((result) => {
        return {
          type: 'Integer',
          value: result.join(''),
        };
      });
    },
    FloatLiteral(rules) {
      return P.seq(
        P.alt(rules.NegativeOperator, P.string('')),
        rules.IntegerLiteral,
        P.regex(/\.[0-9]+/ui),
      ).map((result) => {
        return {
          type: 'Float',
          value: `${String(result[0])}${String(result[1].value)}${result[2]}`,
        };
      });
    },
    HexLiteral(rules) {
      return P.seq(
        P.alt(rules.NegativeOperator, P.string('')),
        P.regex(/0x(?:[1-9a-f][0-9a-f]+|[0-9a-f])/ui),
      ).map((result) => {
        return {
          type: 'Hex',
          value: result.join(''),
        };
      });
    },
    ScientificLiteral(rules) {
      return P.seq(
        P.alt(rules.FloatLiteral, rules.IntegerLiteral),
        P.regex(/e[+]?\d+/ui),
      ).map((result) => {
        return {
          type: 'Scientific',
          value: `${String(result[0].value)}${result[1]}`,
        };
      });
    },
    BooleanLiteral(rules) {
      return P.regex(/true|false/ui).map((result) => {
        return {
          type: 'Boolean',
          value: result === 'true' ? '1' : '0',
        };
      });
    },
    Identifer(rules) {
      return version === 1
        ? P.regex(/[^\s.!<>="]+/ui)
        : P.regex(/[^\s.!<>=$@"]+/ui);
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
    Expression(rules) {
      return P.alt(
        rules.LogicalExpression,
        rules.Value,
      ).map((result) => {
        return {
          type: 'Expression',
          value: result,
        };
      });
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
          value: result,
        };
      });
    },
  });
};
