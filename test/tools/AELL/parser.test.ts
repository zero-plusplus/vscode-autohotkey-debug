import { describe, expect, test } from '@jest/globals';
import { createAELLParser } from '../../../src/tools/AELL/parser';
import { SyntaxKind } from '../../../src/types/tools/AELL/common.types';

describe('parser', () => {
  const parseAELL = createAELLParser('1.0.0');

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
