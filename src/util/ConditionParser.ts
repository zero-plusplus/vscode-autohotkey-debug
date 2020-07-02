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
      return version === 1
        ? rules.StringDoubleLiteral
        : P.alt(rules.StringDoubleLiteral, rules.StringSingleLiteral);
    },
    StringDoubleLiteral(rules) {
      return P.seq(
        P.string('"'),
        version === 1
          ? P.regex(/(?:""|[^"\n])*/ui)
          : P.regex(/(?:`"|[^"\n])*/ui),
        P.string('"'),
      ).map((result) => {
        const convertedEscape = result[1]
          .replace(version === 1 ? /""/gu : /`"/gu, '"')
          .replace(/(?<=`)(,|%|`|;|::)/giu, '$1')
          .replace(/`n/gu, '\n')
          .replace(/`r/gu, '\r')
          .replace(/`b/gu, '\b')
          .replace(/`t/gu, '\t')
          .replace(/`v/gu, '\v')
          .replace(/`a/gu, '\x07')
          .replace(/`f/gu, '\f');
        return {
          type: 'String',
          value: convertedEscape,
        };
      });
    },
    StringSingleLiteral(rules) {
      return P.seq(
        P.string(`'`),
        P.regex(/(?:`'|[^'\n])*/ui),
        P.string(`'`),
      ).map((result) => {
        const convertedEscape = result[1]
          .replace(/`'/gu, '\'')
          .replace(/(?<=`)(,|%|`|;|::)/giu, '$1')
          .replace(/`n/gu, '\n')
          .replace(/`r/gu, '\r')
          .replace(/`b/gu, '\b')
          .replace(/`t/gu, '\t')
          .replace(/`v/gu, '\v')
          .replace(/`a/gu, '\x07')
          .replace(/`f/gu, '\f');
        return {
          type: 'String',
          value: convertedEscape,
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
        version === 1
          ? rules.FloatLiteral
          : P.alt(rules.FloatLiteral, rules.IntegerLiteral),
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
        ? P.regex(/[^\s.!<>="[\]]+/ui)
        : P.regex(/[^\s.!<>=$@"[\]]+/ui);
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
      ).map((result) => `${result[0]}${result[1].value.value.value as string}${result[2]}`);
    },
    BaseAccesor(rules) {
      return P.string('.<base>');
    },
    PropertyName(rules) {
      return P.seq(
        rules.Identifer,
        P.alt(
          rules.PropertyAccesor,
          rules.IndexAccesor,
          rules.BaseAccesor,
        ).many(),
      ).map((result) => {
        return {
          type: 'PropertyName',
          value: `${String(result[0])}${result[1].join('')}`,
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
