import { describe, expect, test } from '@jest/globals';
import { createGreenNodeFactory } from '../../../../src/tools/autohotkey/parser/greenNodeFactory';
import { SyntaxKind } from '../../../../src/types/tools/autohotkey/parser/common.types';
import { printGreenNode } from '../../../../src/tools/autohotkey/parser/utils';

describe('utils', () => {
  describe('printGreenNode', () => {
    const factory = createGreenNodeFactory();

    test('token', () => {
      const token = factory.createNumberLiteral('123');
      expect(printGreenNode(token)).toBe('123');
    });
    test('binary expression', () => {
      const greenNode = factory.createNode(SyntaxKind.BinaryExpression, [
        factory.createNumberLiteral('123'),
        factory.createSpaceTrivia(),
        factory.createPlusToken(),
        factory.createSpaceTrivia(),
        factory.createNumberLiteral('123'),

      ]);
      expect(printGreenNode(greenNode)).toBe('123 + 123');
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
        factory.createSpaceTrivia(),
        factory.createPlusToken(),
        factory.createSpaceTrivia(),
        factory.createNumberLiteral('123'),
      ]);
      expect(printGreenNode(nestedNode)).toBe('123 + 123 + 123');
    });
  });
});
