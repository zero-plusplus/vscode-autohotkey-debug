import * as P from 'parsimmon';

export default P.createLanguage({
  _(rules) {
    return P.regex(/\s*/u);
  },
  __(rules) {
    return P.whitespace;
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
