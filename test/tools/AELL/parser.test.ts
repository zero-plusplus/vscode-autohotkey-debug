import { describe, expect, test } from '@jest/globals';
import { createAELLParser } from '../../../src/tools/AELL/parser';
import { ParseError } from '../../../src/tools/autohotkey/parser/expression/grammars/utils';
import { DereferenceExpression, Identifier, NameSubstitutionExpression, SequenceExpression, SyntaxKind } from '../../../src/types/tools/autohotkey/parser/common.types';

describe('parser', () => {
  describe('v1.1', () => {
    const { parse: parseAELL } = createAELLParser('1.1.30');

    test.each`
      text                | expectedKind                              | expectedValue
      ${'$abc'}           | ${SyntaxKind.Identifier}                  | ${'$abc'}
      ${'<exception>'}    | ${SyntaxKind.Identifier}                  | ${'<exception>'}
      ${'<$hitCount>'}    | ${SyntaxKind.Identifier}                  | ${'<$hitCount>'}
      ${'"abc"'}          | ${SyntaxKind.StringLiteral}               | ${'abc'}
      ${'1'}              | ${SyntaxKind.NumberLiteral}               | ${1}
      ${'true'}           | ${SyntaxKind.BooleanLiteral}              | ${true}
    `('primary expression', ({ text, expectedKind, expectedValue }) => {
      const ast = parseAELL(String(text));
      expect(ast.kind).toBe(expectedKind);
      if (ast.kind !== expectedKind) {
        throw Error();
      }

      if (!('value' in ast)) {
        throw Error();
      }
      expect(ast.value).toBe(expectedValue);
      if (!('text' in ast)) {
        throw Error();
      }
      expect(ast.text).toBe(text);
    });

    test.each`
      text                | expectedKind                              | expectedValue
      ${'%1 + 1%'}        | ${SyntaxKind.DereferenceExpression}       | ${'%1 + 1%'}
    `('DereferenceExpression', ({ text, expectedKind, expectedValue }) => {
      expect(() => parseAELL(String(text))).toThrow(ParseError);
    });

    test('NameSubstitutionExpression', () => {
      const ast = parseAELL<NameSubstitutionExpression>('a%b%c%d%e');
      expect(ast.kind).toBe(SyntaxKind.NameSubstitutionExpression);

      expect(ast.expressions[0].kind).toBe(SyntaxKind.Identifier);
      expect((ast.expressions[0] as Identifier).text).toBe('a');

      expect(ast.expressions[1].kind).toBe(SyntaxKind.DereferenceExpression);
      expect(((ast.expressions[1] as DereferenceExpression).expression as Identifier).text).toBe('b');

      expect(ast.expressions[2].kind).toBe(SyntaxKind.Identifier);
      expect((ast.expressions[2] as Identifier).text).toBe('c');

      expect(ast.expressions[3].kind).toBe(SyntaxKind.DereferenceExpression);
      expect(((ast.expressions[3] as DereferenceExpression).expression as Identifier).text).toBe('d');

      expect(ast.expressions[4].kind).toBe(SyntaxKind.Identifier);
      expect((ast.expressions[4] as Identifier).text).toBe('e');
    });

    test.each`
      text               | expectedKind                             | expectedOperator | expectedOperand
      ${'+a'}            | ${SyntaxKind.UnaryExpression}            | ${'+'}           | ${{ kind: SyntaxKind.Identifier, value: 'a' }}
      ${'-a'}            | ${SyntaxKind.UnaryExpression}            | ${'-'}           | ${{ kind: SyntaxKind.Identifier, value: 'a' }}
      ${'!a'}            | ${SyntaxKind.UnaryExpression}            | ${'!'}           | ${{ kind: SyntaxKind.Identifier, value: 'a' }}
      ${'&a'}            | ${SyntaxKind.UnaryExpression}            | ${'&'}           | ${{ kind: SyntaxKind.Identifier, value: 'a' }}
      ${'~a'}            | ${SyntaxKind.UnaryExpression}            | ${'~'}           | ${{ kind: SyntaxKind.Identifier, value: 'a' }}
      ${'*a'}            | ${SyntaxKind.UnaryExpression}            | ${'*'}           | ${{ kind: SyntaxKind.Identifier, value: 'a' }}
      ${'^a'}            | ${SyntaxKind.UnaryExpression}            | ${'^'}           | ${{ kind: SyntaxKind.Identifier, value: 'a' }}
      ${'++1'}           | ${SyntaxKind.PrefixUnaryExpression}      | ${'++'}          | ${{ kind: SyntaxKind.NumberLiteral, value: 1 }}
      ${'--1'}           | ${SyntaxKind.PrefixUnaryExpression}      | ${'--'}          | ${{ kind: SyntaxKind.NumberLiteral, value: 1 }}
      ${'1++'}           | ${SyntaxKind.PostfixUnaryExpression}     | ${'++'}          | ${{ kind: SyntaxKind.NumberLiteral, value: 1 }}
      ${'1--'}           | ${SyntaxKind.PostfixUnaryExpression}     | ${'--'}          | ${{ kind: SyntaxKind.NumberLiteral, value: 1 }}
    `('unary expression', ({ text, expectedKind, expectedOperator, expectedOperand }) => {
      const ast = parseAELL(String(text));
      expect(ast.kind).toBe(expectedKind);
      if (ast.kind !== expectedKind) {
        throw Error();
      }

      if (!('operator' in ast)) {
        throw Error();
      }
      expect(ast.operator.text).toBe(expectedOperator);

      if (!('operand' in ast)) {
        throw Error();
      }
      expect(ast.operand).toMatchObject(expectedOperand as Record<any, any>);
    });

    test.each`
      text              | expectedKind                    | expectedLeft                                      | expectedOperator  | expectedRight
      ${'a := b'}       | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}    | ${':='}           | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'a += b'}       | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}    | ${'+='}           | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'a -= b'}       | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}    | ${'-='}           | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'a *= b'}       | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}    | ${'*='}           | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'a /= b'}       | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}    | ${'/='}           | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'a //= b'}      | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}    | ${'//='}          | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'a .= b'}       | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}    | ${'.='}           | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'a |= b'}       | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}    | ${'|='}           | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'a ^= b'}       | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}    | ${'^='}           | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'a &= b'}       | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}    | ${'&='}           | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'a <<= b'}      | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}    | ${'<<='}          | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'a >>= b'}      | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}    | ${'>>='}          | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'a >>>= b'}     | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}    | ${'>>>='}         | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'1 + 1.2'}      | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'+'}            | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 * 1.2'}      | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'*'}            | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 / 1.2'}      | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'/'}            | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 // 1.2'}     | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'//'}           | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 ** 1.2'}     | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'**'}           | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 << 1.2'}     | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'<<'}           | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 >> 1.2'}     | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'>>'}           | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 >>> 1.2'}    | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'>>>'}          | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 ~= 1.2'}     | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'~='}           | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 < 1.2'}      | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'<'}            | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 <= 1.2'}     | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'<='}           | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 > 1.2'}      | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'>'}            | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 >= 1.2'}     | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'>='}           | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 = 1.2'}      | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'='}            | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 == 1.2'}     | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'=='}           | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 != 1.2'}     | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'!='}           | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 !== 1.2'}    | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'!=='}          | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 || 1.2'}     | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'||'}           | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 or 1.2'}     | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'or'}           | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 && 1.2'}     | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'&&'}           | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 and 1.2'}    | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'and'}          | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 . 1.2'}      | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'.'}            | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
      ${'1 1.2'}        | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${' '}            | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
    `('binary expression', ({ text, expectedKind, expectedLeft, expectedOperator, expectedRight }) => {
      const ast = parseAELL(String(text));
      expect(ast.kind).toBe(expectedKind);
      if (!('left' in ast)) {
        throw Error();
      }
      expect(ast.left).toMatchObject(expectedLeft as Record<any, any>);

      if (!('operator' in ast)) {
        throw Error();
      }
      expect(ast.operator.text).toBe(expectedOperator);

      if (!('right' in ast)) {
        throw Error();
      }
      expect(ast.right).toMatchObject(expectedRight as Record<any, any>);
    });

    test('SequenceExpression', () => {
      const ast = parseAELL<SequenceExpression>('1, 1');
      expect(ast.kind).toBe(SyntaxKind.SequenceExpression);
    });

    test('precedence', () => {
      const ast = parseAELL('1 * 2 + 3 * 4');
      expect(ast.kind).toBe(SyntaxKind.BinaryExpression);
      if (!('left' in ast)) {
        throw Error();
      }
      expect(ast.left).toMatchObject({ kind: SyntaxKind.BinaryExpression, left: { kind: SyntaxKind.NumberLiteral, value: 1 }, operator: { kind: SyntaxKind.AsteriskToken, text: '*' }, right: { kind: SyntaxKind.NumberLiteral, value: 2 } });

      if (!('operator' in ast)) {
        throw Error();
      }
      expect(ast.operator.text).toBe('+');

      if (!('right' in ast)) {
        throw Error();
      }
      expect(ast.right).toMatchObject({ kind: SyntaxKind.BinaryExpression, left: { kind: SyntaxKind.NumberLiteral, value: 3 }, operator: { kind: SyntaxKind.AsteriskToken, text: '*' }, right: { kind: SyntaxKind.NumberLiteral, value: 4 } });
    });
  });

  describe('v2.0', () => {
    const { parse: parseAELL } = createAELLParser('2.0.0');

    test.each`
      text      | expectedError
      ${'#abc'} | ${ParseError}
      ${'$abc'} | ${ParseError}
      ${'@abc'} | ${ParseError}
    `('identifier', ({ text, expected }) => {
      expect(() => parseAELL(String(text))).toThrow(expected);
    });

    test.each`
      text      | expected
      ${'"abc"'} | ${'abc'}
      ${`'abc'`} | ${'abc'}
    `('string', ({ text, expected }) => {
      expect(parseAELL(String(text))).toMatchObject({ value: expected });
    });

    test.each`
      text                | expectedKind                              | expectedValue
      ${'%1 + 1%'}        | ${SyntaxKind.DereferenceExpression}       | ${'%1 + 1%'}
    `('DereferenceExpression', ({ text, expectedKind, expectedValue }) => {
      const ast = parseAELL<DereferenceExpression>(String(text));
      expect(ast.kind).toBe(SyntaxKind.DereferenceExpression);
      expect(ast.expression.kind).toBe(SyntaxKind.BinaryExpression);
    });
  });
});
