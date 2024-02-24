import { describe, expect, test } from '@jest/globals';
import { createGreenNodeFactory } from '../../../../src/tools/autohotkey/parser/greenNodeFactory';
import { SyntaxKind } from '../../../../src/types/tools/autohotkey/parser/common.types';

describe('greenNodeFactory', () => {
  const factory = createGreenNodeFactory();
  test('binary expression', () => {
    const greenNode = factory.createNode(SyntaxKind.BinaryExpression, [
      factory.createToken(SyntaxKind.NumberLiteral, '123'),
      factory.createToken(SyntaxKind.HorizSpaceTrivia, ' '),
      factory.createToken(SyntaxKind.PlusToken, '+'),
      factory.createToken(SyntaxKind.HorizSpaceTrivia, ' '),
      factory.createToken(SyntaxKind.NumberLiteral, '123'),
    ]);
    expect(greenNode.width).toBe('123 + 123'.length);
  });

  test('nested node', () => {
    const left = factory.createNode(SyntaxKind.BinaryExpression, [
      factory.createToken(SyntaxKind.NumberLiteral, '123'),
      factory.createToken(SyntaxKind.HorizSpaceTrivia, ' '),
      factory.createToken(SyntaxKind.PlusToken, '+'),
      factory.createToken(SyntaxKind.HorizSpaceTrivia, ' '),
      factory.createToken(SyntaxKind.NumberLiteral, '123'),
    ]);

    const nestedNode = factory.createNode(SyntaxKind.BinaryExpression, [
      left,
      factory.createToken(SyntaxKind.HorizSpaceTrivia, ' '),
      factory.createToken(SyntaxKind.PlusToken, '+'),
      factory.createToken(SyntaxKind.HorizSpaceTrivia, ' '),
      factory.createToken(SyntaxKind.NumberLiteral, '123'),
    ]);
    expect(nestedNode.width).toBe('123 + 123 + 123'.length);
  });
});
