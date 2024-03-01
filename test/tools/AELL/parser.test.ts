import { describe, expect, test } from '@jest/globals';
import { ParseError, createAELLParser } from '../../../src/tools/AELL/parser';
import { SyntaxKind } from '../../../src/types/tools/AELL/common.types';

describe('parser', () => {
  describe('v1.1', () => {
    const parseAELL = createAELLParser('1.1.30');

    test.each`
      text                | expectedKind                      | expectedValue
      ${'$abc'}           | ${SyntaxKind.Identifier}          | ${'$abc'}
      ${'<exception>'}    | ${SyntaxKind.Identifier}          | ${'<exception>'}
      ${'<$hitCount>'}    | ${SyntaxKind.Identifier}          | ${'<$hitCount>'}
      ${'"abc"'}          | ${SyntaxKind.StringLiteral}       | ${'abc'}
      ${'1'}              | ${SyntaxKind.NumberLiteral}       | ${1}
    `('identifier', ({ text, expectedKind, expectedValue }) => {
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
      ${'a <<= b'}      | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}   | ${'<<='}           | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'a >>= b'}      | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}   | ${'>>='}           | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
      ${'a >>>= b'}     | ${SyntaxKind.AssignExpression}  | ${{ kind: SyntaxKind.Identifier, value: 'a' }}  | ${'>>>='}           | ${{ kind: SyntaxKind.Identifier, value: 'b' }}
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
      ${'1 && 1.2'}     | ${SyntaxKind.BinaryExpression}  | ${{ kind: SyntaxKind.NumberLiteral, text: '1' }}  | ${'&&'}           | ${{ kind: SyntaxKind.NumberLiteral, text: '1.2' }}
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
      expect(ast.operator).toBe(expectedOperator);

      if (!('right' in ast)) {
        throw Error();
      }
      expect(ast.right).toMatchObject(expectedRight as Record<any, any>);
    });
  });

  describe('v2.0', () => {
    const parseAELL = createAELLParser('2.0.0');

    test('identifier', () => {
      expect(() => parseAELL('$abc')).toThrow(ParseError);
    });

    test('meta identifier', () => {
      const ast = parseAELL('<$meta>');
      expect(ast.kind).toBe(SyntaxKind.Identifier);
      if (ast.kind !== SyntaxKind.Identifier) {
        throw Error();
      }
      expect(ast.value).toBe('<$meta>');
    });
  });
});
