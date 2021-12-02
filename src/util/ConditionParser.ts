import * as P from 'parsimmon';
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';

export type Parser = P.Language;
export const createParser = function(version: AhkVersion): P.Language {
  return P.createLanguage({
    _(rules) {
      return P.regex(/\s*/u);
    },
    __(rules) {
      return P.whitespace;
    },
    StringLiteral(rules) {
      return version.mejor <= 1.1
        ? rules.StringDoubleLiteral
        : P.alt(rules.StringDoubleLiteral, rules.StringSingleLiteral);
    },
    StringDoubleLiteral(rules) {
      return P.seq(
        P.string('"'),
        version.mejor <= 1.1
          ? P.regex(/(?:``|""|[^"\n])*/ui)
          : P.regex(/(?:``|`"|[^"\n])*/ui),
        P.string('"'),
      ).map((result) => {
        const convertedEscape = result[1]
          .replace(version.mejor <= 1.1 ? /""/gu : /`"/gu, '"')
          .replace(version.mejor <= 1.1 ? /`(,|%|`|;|:)/gu : /`(`|;|:|\{)/gu, '$1')
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
        P.regex(/(?:``|`'|[^'\n])*/ui),
        P.string(`'`),
      ).map((result) => {
        const convertedEscape = result[1]
          .replace(/`'/gu, '\'')
          .replace(/`(`|;|:|\{)/gu, '$1')
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
          value: parseInt(result.join(''), 10),
        };
      });
    },
    FloatLiteral(rules) {
      return P.seq(
        P.alt(rules.NegativeOperator, P.string('')),
        rules.IntegerLiteral,
        P.regex(/\.[0-9]+/ui),
      ).map((result) => {
        const floatString = `${String(result[0])}${String(result[1].value)}${result[2]}`;
        return {
          type: 'Float',
          value: 2 <= version.mejor ? parseFloat(floatString) : floatString,
        };
      });
    },
    HexLiteral(rules) {
      return P.seq(
        P.alt(rules.NegativeOperator, P.string('')),
        P.regex(/0x(?:[0-9a-f]+)/ui),
      ).map((result) => {
        return {
          type: 'Hex',
          value: parseInt(result.join(''), 10),
        };
      });
    },
    ScientificLiteral(rules) {
      return P.seq(
        version.mejor <= 1.1
          ? rules.FloatLiteral
          : P.alt(rules.FloatLiteral, rules.IntegerLiteral),
        P.regex(/e[+]?\d+/ui),
      ).map((result) => {
        const rawValue = `${String(result[0].value)}${result[1]}`;
        return {
          type: 'Scientific',
          value: version.mejor <= 1.1 ? rawValue : Number(rawValue).toFixed(1),
        };
      });
    },
    BooleanLiteral(rules) {
      return P.regex(/true|false/ui).map((result) => {
        return {
          type: 'Boolean',
          value: (/^true$/ui).test(result) ? '1' : '0',
        };
      });
    },
    RegexpLiteral(rules) {
      return P.seq(
        P.string('/'),
        P.regex(/(\/|[^/])+(?=\/)/u),
        P.alt(
          P.seq(
            P.string('/'),
            P.regex(/([gimsuy]+)(?=\b)/u),
          ).map((result) => result.join('')),
          P.string('/'),
        ),
      ).map((result) => {
        return {
          type: 'RegExp',
          value: result.join(''),
        };
      });
    },
    Identifer(rules) {
      return version.mejor <= 1.1
        ? P.regex(/[\w#@$]+/ui)
        : P.regex(/[\w]+/ui);
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
        P.alt(rules.Primitive, rules.PropertyName),
        P.string(']'),
      ).map((result) => {
        if ('type' in result[1] && result[1].type === 'Primitive') {
          const primitive = result[1].value;
          if (primitive.type === 'String') {
            return `["${String(result[1].value.value)}"]`;
          }
          return `[${String(result[1].value.value)}]`;
        }
        return `[${String(result[1].value)}]`;
      });
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
    MetaVariable(rules) {
      return P.seq(
        P.string('{'),
        rules.PropertyName,
        P.string('}'),
      ).map((result) => {
        return {
          type: 'MetaVariable',
          value: result[1],
        };
      });
    },
    Operand(rules) {
      return P.alt(
        P.seq(
          P.alt(rules.CountofOperator),
          P.alt(
            rules.Primitive,
            rules.RegexpLiteral,
            rules.PropertyName,
            rules.MetaVariable,
          ),
        ).map((result) => {
          return {
            type: result[1].type,
            value: result[1].value,
            extraInfo: result[0].value,
          };
        }),
        P.alt(
          rules.Primitive,
          rules.RegexpLiteral,
          rules.PropertyName,
          rules.MetaVariable,
        ),
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
    Expressions(rules) {
      return P.alt(
        P.seq(
          rules.Expression,
          rules._,
          rules.LogicalOperator,
          rules._,
          rules.Expression,
          P.regex(/.*/u), // rest expression
        ).node(''),
        rules.Expression.node(''),
      ).map((result) => {
        const pos = {
          start: result.start,
          end: result.end,
        };

        if (result.value.length === 6) {
          return {
            type: 'Expressions',
            value: [ result.value[0], result.value[2], result.value[4], result.value[5] ],
            pos,
          };
        }
        return {
          type: 'Expression',
          value: result.value,
          pos,
        };
      });
    },
    Expression(rules) {
      return P.alt(
        rules.BinaryExpression,
        rules.Operand,
      ).map((result) => {
        return {
          type: 'Expression',
          value: result,
        };
      });
    },
    BinaryExpression(rules) {
      return P.seq(
        rules.Operand,
        rules.Operator,
        rules.Operand,
      ).map((result) => {
        return {
          type: 'BinaryExpression',
          value: result,
        };
      });
    },
    Operator(rules) {
      return P.alt(
        rules.ComparisonOperator,
        rules.IsOperator,
        rules.InOperator,
        rules.HasOperator,
        rules.ContainsOperator,
      );
    },
    LogicalOperator(rules) {
      return P.alt(P.string('&&'), P.string('||'));
    },
    ComparisonOperator(rules) {
      return P.seq(
        rules._,
        P.alt(
          P.string('=='),
          P.string('='),
          P.string('!=='),
          P.string('!='),
          P.string('<='),
          P.string('<'),
          P.string('>='),
          P.string('>'),
          P.string('~='),
          P.string('!~'),
        ),
        rules._,
      ).map((result) => {
        return {
          type: 'ComparisonOperator',
          value: result[1],
        };
      });
    },
    IsOperator(rules) {
      return P.regex(/\s+(is not|is)\s+/ui).map((result) => {
        return {
          type: 'IsOperator',
          value: result.toLowerCase().trim(),
        };
      });
    },
    InOperator(rules) {
      return P.regex(/\s+(not in|in)\s+/ui).map((result) => {
        return {
          type: 'InOperator',
          value: result.toLowerCase().trim(),
        };
      });
    },
    HasOperator(rules) {
      return P.regex(/\s+(not has|has)\s+/ui).map((result) => {
        return {
          type: 'HasOperator',
          value: result.toLowerCase().trim(),
        };
      });
    },
    ContainsOperator(rules) {
      return P.regex(/\s+(not contains|contains)\s+/ui).map((result) => {
        return {
          type: 'ContainsOperator',
          value: result.toLowerCase().trim(),
        };
      });
    },
    CountofOperator(rules) {
      return P.regex(/countof\s+/ui)
        .map((result) => {
          return {
            type: 'CountofOperator',
            value: result.toLowerCase().trim(),
          };
        });
    },
  });
};
