import { describe, expect, test } from '@jest/globals';
import { createGreenNodeFactory } from '../../../../src/tools/autohotkey/parser/greenNodeFactory';
import { SyntaxKind } from '../../../../src/types/tools/autohotkey/parser/common.types';

describe('greenNodeFactory', () => {
  const factory = createGreenNodeFactory();
  test('binary expression', () => {
    const greenNode = factory.createNode(SyntaxKind.BinaryExpression, [
      factory.createNumberLiteral('123'),
      factory.createSpaceTrivia(),
      factory.createPlusToken(),
      factory.createSpaceTrivia(),
      factory.createNumberLiteral('123'),
    ]);
    expect(greenNode.width).toBe('123 + 123'.length);
  });

  test('nested node', () => {
    const left = factory.createNode(SyntaxKind.BinaryExpression, [
      factory.createNumberLiteral('123'),
      factory.createSpaceTrivia(),
      factory.createPlusToken(),
      factory.createSpaceTrivia(),
      factory.createNumberLiteral('123'),
    ]);

    const nestedNode = factory.createNode(SyntaxKind.BinaryExpression, [
      left,
      factory.createSpaceTrivia(),
      factory.createPlusToken(),
      factory.createSpaceTrivia(),
      factory.createNumberLiteral('123'),
    ]);
    expect(nestedNode.width).toBe('123 + 123 + 123'.length);
  });
});
