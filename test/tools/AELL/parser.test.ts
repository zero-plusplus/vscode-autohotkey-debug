import { describe, expect, test } from '@jest/globals';
import { ParseError, createAELLParser } from '../../../src/tools/AELL/parser';
import { SyntaxKind } from '../../../src/types/tools/AELL/common.types';

describe('parser', () => {
  describe('v1.1', () => {
    const parseAELL = createAELLParser('1.1.30');

    test('identifier', () => {
      const ast = parseAELL('$abc');
      expect(ast.kind).toBe(SyntaxKind.Identifier);
      if (ast.kind !== SyntaxKind.Identifier) {
        throw Error();
      }
      expect(ast.value).toBe('$abc');
    });

    test('meta identifier', () => {
      const ast = parseAELL('<exception>');
      expect(ast.kind).toBe(SyntaxKind.Identifier);
      if (ast.kind !== SyntaxKind.Identifier) {
        throw Error();
      }
      expect(ast.value).toBe('<exception>');
    });

    test('meta identifier', () => {
      const ast = parseAELL('<exception>');
      expect(ast.kind).toBe(SyntaxKind.Identifier);
      if (ast.kind !== SyntaxKind.Identifier) {
        throw Error();
      }
      expect(ast.value).toBe('<exception>');
    });

    test('binary expression', () => {
      const ast = parseAELL('a := b');
      expect(ast.kind).toBe(SyntaxKind.AssignExpression);
      if (ast.kind !== SyntaxKind.AssignExpression) {
        throw Error();
      }

      expect(ast.left.kind).toBe(SyntaxKind.Identifier);
      if (ast.left.kind !== SyntaxKind.Identifier) {
        throw Error();
      }
      expect(ast.left.value).toBe('a');

      expect(ast.right.kind).toBe(SyntaxKind.Identifier);
      if (ast.right.kind !== SyntaxKind.Identifier) {
        throw Error();
      }
      expect(ast.right.value).toBe('b');
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
