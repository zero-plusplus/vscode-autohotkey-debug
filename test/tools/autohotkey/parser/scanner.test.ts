import { describe, expect, test } from '@jest/globals';
import { createScanner } from '../../../../src/tools/autohotkey/parser/scanner';
import { RuntimeTarget } from '../../../../src/types/tools/autohotkey/parser/common.types';
import { createGreenNodeFactory } from '../../../../src/tools/autohotkey/parser/greenNodeFactory';

describe('scanner', () => {
  const factory = createGreenNodeFactory();
  const scanner = createScanner(RuntimeTarget.v1);
  test('abc', () => {
    scanner.setText('1 + 1');
    expect(scanner.scan()).toEqual(factory.createNumberLiteral('1'));
    expect(scanner.scan()).toEqual(factory.createSpaceTrivia());
    expect(scanner.scan()).toEqual(factory.createPlusToken());
    expect(scanner.scan()).toEqual(factory.createSpaceTrivia());
    expect(scanner.scan()).toEqual(factory.createNumberLiteral('1'));
  });
});
