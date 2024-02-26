/* eslint-disable no-bitwise */
import { describe, expect, test } from '@jest/globals';
import { createScanner } from '../../../../src/tools/autohotkey/parser/scanner';
import { RuntimeTarget, TokenFlags } from '../../../../src/types/tools/autohotkey/parser/common.types';
import { createGreenNodeFactory } from '../../../../src/tools/autohotkey/parser/greenNodeFactory';

describe('scanner', () => {
  const factory = createGreenNodeFactory();
  const scanner = createScanner(RuntimeTarget.v1);

  test.each`
    text   |expected
    ${'+'}     | ${factory.createPlusToken()}
    ${'++'}    | ${factory.createPlusPlusToken()}
    ${'+='}    | ${factory.createPlusEqualsToken()}
    ${'-'}     | ${factory.createMinusToken()}
    ${'--'}    | ${factory.createMinusMinusToken()}
    ${'-='}    | ${factory.createMinusEqualsToken()}
    ${'*'}     | ${factory.createAsteriskToken()}
    ${'**'}    | ${factory.createAsteriskAsteriskToken()}
    ${'*='}    | ${factory.createAsteriskEqualsToken()}
    ${'/'}     | ${factory.createSlashToken()}
    ${'//'}    | ${factory.createSlashSlashToken()}
    ${'/='}    | ${factory.createSlashEqualsToken()}
    ${'//='}   | ${factory.createSlashSlashEqualsToken()}
    ${':'}     | ${factory.createColonToken()}
    ${':='}    | ${factory.createColonEqualsToken()}
    ${','}     | ${factory.createCommaToken()}
    ${'='}     | ${factory.createEqualsToken()}
    ${'=='}    | ${factory.createEqualsEqualsToken()}
    ${'=>'}    | ${factory.createEqualsGreaterThanToken(TokenFlags.Unsupported)}
    ${'.'}     | ${factory.createDotToken()}
    ${'.='}    | ${factory.createDotEqualsToken()}
    ${'|'}     | ${factory.createBarToken()}
    ${'||'}    | ${factory.createBarBarToken()}
    ${'|='}    | ${factory.createBarEqualsToken()}
    ${'&'}     | ${factory.createAmpersandToken()}
    ${'&&'}    | ${factory.createAmpersandAmpersandToken()}
    ${'&='}    | ${factory.createAmpersandEqualToken()}
    ${'^'}     | ${factory.createCaretToken()}
    ${'^='}    | ${factory.createCaretEqualsToken()}
    ${'<'}     | ${factory.createLessThanToken()}
    ${'<='}    | ${factory.createLessThanEqualsToken()}
    ${'<<'}    | ${factory.createLessThanLessThanToken()}
    ${'<<='}   | ${factory.createLessThanLessThanEqualsToken()}
    ${'<>'}    | ${factory.createLessThanGreaterThanToken()}
    ${'>'}     | ${factory.createGreaterThanToken()}
    ${'>>'}    | ${factory.createGreaterThanGreaterThanToken()}
    ${'>>='}   | ${factory.createGreaterThanGreaterThanEqualsToken()}
    ${'>>>'}   | ${factory.createGreaterThanGreaterThanGreaterThanToken()}
    ${'>>>='}  | ${factory.createGreaterThanGreaterThanGreaterThanEqualsToken()}
    ${'>='}    | ${factory.createGreaterThanEqualsToken()}
    ${'~'}     | ${factory.createTildeToken()}
    ${'~='}    | ${factory.createTildeEqualsToken()}
    ${'!'}     | ${factory.createExclamationToken()}
    ${'!='}    | ${factory.createExclamationEqualsToken()}
    ${'!=='}   | ${factory.createExclamationEqualsEqualsToken(TokenFlags.Unsupported)}
    ${'%'}     | ${factory.createPercentToken()}
    ${'?'}     | ${factory.createQuestionToken()}
    ${'?.'}    | ${factory.createQuestionDotToken(TokenFlags.Unsupported)}
    ${'??'}    | ${factory.createQuestionQuestionToken(TokenFlags.Unsupported)}
    ${'??='}   | ${factory.createQuestionQuestionEqualsToken(TokenFlags.Unsupported)}
    ${'('}     | ${factory.createOpenParenToken()}
    ${'['}     | ${factory.createOpenBracketToken()}
    ${'{'}     | ${factory.createOpenBraceToken()}
    ${')'}     | ${factory.createCloseParenToken()}
    ${']'}     | ${factory.createCloseBracketToken()}
    ${'}'}     | ${factory.createCloseBraceToken()}
  `('token', ({ text, expected }) => {
    scanner.setText(String(text));
    expect(scanner.scan()).toEqual(expected);
  });

  describe('number literal', () => {
    test.each`
      text      | expected
      ${'1'}    | ${factory.createNumberLiteral('1')}
      ${'100'}  | ${factory.createNumberLiteral('100')}
    `('decimal', ({ text, expected }) => {
      scanner.setText(String(text));
      expect(scanner.scan()).toEqual(expected);
    });

    test.each`
      text      | expected
      ${'1.0'}  | ${factory.createNumberLiteral('1.0', TokenFlags.FloatNumber)}
    `('float', ({ text, expected }) => {
      scanner.setText(String(text));
      expect(scanner.scan()).toEqual(expected);
    });

    test.each`
      text       | expected
      ${'0x123'} | ${factory.createNumberLiteral('0x123', TokenFlags.HexNumber)}
      ${'0X123'} | ${factory.createNumberLiteral('0X123', TokenFlags.HexNumber)}
    `('hex', ({ text, expected }) => {
      scanner.setText(String(text));
      expect(scanner.scan()).toEqual(expected);
    });

    test.each`
      text        | expected
      ${'1.2e3'}  | ${factory.createNumberLiteral('1.2e3', TokenFlags.FloatNumber | TokenFlags.ScientificNotationNumber)}
      ${'1.2E3'}  | ${factory.createNumberLiteral('1.2E3', TokenFlags.FloatNumber | TokenFlags.ScientificNotationNumber)}
      ${'1.2e+3'} | ${factory.createNumberLiteral('1.2e+3', TokenFlags.FloatNumber | TokenFlags.ScientificNotationNumber)}
      ${'1.2E+3'} | ${factory.createNumberLiteral('1.2E+3', TokenFlags.FloatNumber | TokenFlags.ScientificNotationNumber)}
      ${'1.2e-3'} | ${factory.createNumberLiteral('1.2e-3', TokenFlags.FloatNumber | TokenFlags.ScientificNotationNumber)}
      ${'1.2E-3'} | ${factory.createNumberLiteral('1.2E-3', TokenFlags.FloatNumber | TokenFlags.ScientificNotationNumber)}
    `('scientific notation', ({ text, expected }) => {
      scanner.setText(String(text));
      expect(scanner.scan()).toEqual(expected);
    });

    // #region errors
    test('leading zero', () => {
      scanner.setText('0100');
      expect(scanner.scan()).toEqual(factory.createNumberLiteral('0100', TokenFlags.ContainsLeadingZero));
    });
    // #endregion errors
  });

  test('binary', () => {
    scanner.setText('1 + 1');
    expect(scanner.scan()).toEqual(factory.createNumberLiteral('1'));
    expect(scanner.scan()).toEqual(factory.createSpaceTrivia());
    expect(scanner.scan()).toEqual(factory.createPlusToken());
    expect(scanner.scan()).toEqual(factory.createSpaceTrivia());
    expect(scanner.scan()).toEqual(factory.createNumberLiteral('1'));
  });
});
