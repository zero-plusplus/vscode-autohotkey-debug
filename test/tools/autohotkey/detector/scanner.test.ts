/* eslint-disable no-bitwise */
import { describe, expect, test } from '@jest/globals';
import { createScanner } from '../../../../src/tools/autohotkey/detector/scanner';
import { RuntimeTarget, SyntaxKind, TokenFlags } from '../../../../src/types/tools/autohotkey/detector';

describe('scanner', () => {
  describe('v1', () => {
    const scanner = createScanner(RuntimeTarget.v1, '', undefined, true);

    describe('success', () => {
      test('variable declaration', () => {
        scanner.setText('value := "abc"');

        expect(scanner.scan()).toBe(SyntaxKind.Identifier);
        expect(scanner.scan()).toBe(SyntaxKind.ColonEqualsToken);
        expect(scanner.scan()).toBe(SyntaxKind.StringLiteral);
      });
      test('function declaration', () => {
        scanner.setText(`
          foo(arg) {
          }
        `);

        expect(scanner.scan()).toBe(SyntaxKind.Identifier);
        expect(scanner.scan()).toBe(SyntaxKind.OpenParenToken);
        expect(scanner.scan()).toBe(SyntaxKind.Identifier);
        expect(scanner.scan()).toBe(SyntaxKind.CloseParenToken);
        expect(scanner.scan()).toBe(SyntaxKind.OpenBraceToken);
        expect(scanner.scan()).toBe(SyntaxKind.CloseBraceToken);
      });
      test('class declaration', () => {
        scanner.setText(`
          class Foo extends Bar {
            static field := "abc"
            property[] {
              get {
              }
              set {
              }
            }
            method() {
            }
          }
        `);

        // #region class
        expect(scanner.scan()).toBe(SyntaxKind.ClassKeyword);
        expect(scanner.scan()).toBe(SyntaxKind.Identifier);
        expect(scanner.scan()).toBe(SyntaxKind.ExtendsKeyword);
        expect(scanner.scan()).toBe(SyntaxKind.Identifier);
        expect(scanner.scan()).toBe(SyntaxKind.OpenBraceToken);

        // #region field
        expect(scanner.scan()).toBe(SyntaxKind.StaticKeyword);
        expect(scanner.scan()).toBe(SyntaxKind.Identifier);
        expect(scanner.scan()).toBe(SyntaxKind.ColonEqualsToken);
        expect(scanner.scan()).toBe(SyntaxKind.StringLiteral);
        // #endregion field

        // #region property
        expect(scanner.scan()).toBe(SyntaxKind.Identifier);
        expect(scanner.scan()).toBe(SyntaxKind.OpenBracketToken);
        expect(scanner.scan()).toBe(SyntaxKind.CloseBracketToken);
        expect(scanner.scan()).toBe(SyntaxKind.OpenBraceToken);

        expect(scanner.scan()).toBe(SyntaxKind.GetKeyword);
        expect(scanner.scan()).toBe(SyntaxKind.OpenBraceToken);
        expect(scanner.scan()).toBe(SyntaxKind.CloseBraceToken);

        expect(scanner.scan()).toBe(SyntaxKind.SetKeyword);
        expect(scanner.scan()).toBe(SyntaxKind.OpenBraceToken);
        expect(scanner.scan()).toBe(SyntaxKind.CloseBraceToken);

        expect(scanner.scan()).toBe(SyntaxKind.CloseBraceToken);
        // #endregion property

        // #region method
        expect(scanner.scan()).toBe(SyntaxKind.Identifier);
        expect(scanner.scan()).toBe(SyntaxKind.OpenParenToken);
        expect(scanner.scan()).toBe(SyntaxKind.CloseParenToken);
        expect(scanner.scan()).toBe(SyntaxKind.OpenBraceToken);
        expect(scanner.scan()).toBe(SyntaxKind.CloseBraceToken);
        // #endregion method

        expect(scanner.scan()).toBe(SyntaxKind.CloseBraceToken);
        // #endregion class
      });
      test('requires directive', () => {
        scanner.setText(`#Requires AutoHotkey v1.31.00`);

        expect(scanner.scan()).toBe(SyntaxKind.Identifier);
        expect(scanner.scanRawString()).toBe(SyntaxKind.RawString);
      });
      describe('Include directive', () => {
        test('path', () => {
          scanner.setText(`#Include *i %A_LineFile%\\..\\main.ahk`);

          expect(scanner.scan()).toBe(SyntaxKind.Identifier);
          expect(scanner.scan()).toBe(SyntaxKind.AsteriskToken);
          expect(scanner.scan()).toBe(SyntaxKind.Identifier);
          expect(scanner.scan()).toBe(SyntaxKind.PercentToken);
          expect(scanner.scan()).toBe(SyntaxKind.Identifier);
          expect(scanner.scan()).toBe(SyntaxKind.PercentToken);
          expect(scanner.scanRawString()).toBe(SyntaxKind.RawString);
        });
        test('lib', () => {
          scanner.setText(`#Include *i <lib>`);

          expect(scanner.scan()).toBe(SyntaxKind.Identifier);
          expect(scanner.scan()).toBe(SyntaxKind.AsteriskToken);
          expect(scanner.scan()).toBe(SyntaxKind.Identifier);
          expect(scanner.scan()).toBe(SyntaxKind.LessThanToken);
          expect(scanner.scan()).toBe(SyntaxKind.Identifier);
          expect(scanner.scan()).toBe(SyntaxKind.GreaterThanToken);
        });
      });
    });
    describe('error', () => {
      test('single quotation string', () => {
        scanner.setText(`value := 'abc'`);

        expect(scanner.scan()).toBe(SyntaxKind.Identifier);
        expect(scanner.scan()).toBe(SyntaxKind.ColonEqualsToken);
        expect(scanner.scan()).toBe(SyntaxKind.StringLiteral);
        expect(TokenFlags.UnSupported & scanner.getTokenFlags()).toBeTruthy();
      });
      test('EqualsGreaterThanToken', () => {
        scanner.setText(`() => ""`);

        expect(scanner.scan()).toBe(SyntaxKind.OpenParenToken);
        expect(scanner.scan()).toBe(SyntaxKind.CloseParenToken);
        expect(scanner.scan()).toBe(SyntaxKind.EqualsGreaterThanToken);
        expect(TokenFlags.UnSupported & scanner.getTokenFlags()).toBeTruthy();
        expect(scanner.scan()).toBe(SyntaxKind.StringLiteral);
      });
      test('ExclamationEqualsEqualsToken', () => {
        scanner.setText(`"" !== ""`);

        expect(scanner.scan()).toBe(SyntaxKind.StringLiteral);
        expect(scanner.scan()).toBe(SyntaxKind.ExclamationEqualsEqualsToken);
        expect(TokenFlags.UnSupported & scanner.getTokenFlags()).toBeTruthy();
        expect(scanner.scan()).toBe(SyntaxKind.StringLiteral);
      });
      test('QuestionQuestionToken', () => {
        scanner.setText(`"" ?? ""`);

        expect(scanner.scan()).toBe(SyntaxKind.StringLiteral);
        expect(scanner.scan()).toBe(SyntaxKind.QuestionQuestionToken);
        expect(TokenFlags.UnSupported & scanner.getTokenFlags()).toBeTruthy();
        expect(scanner.scan()).toBe(SyntaxKind.StringLiteral);
      });
      test('QuestionQuestionEqualsToken', () => {
        scanner.setText(`abc ??= ""`);

        expect(scanner.scan()).toBe(SyntaxKind.Identifier);
        expect(scanner.scan()).toBe(SyntaxKind.QuestionQuestionEqualsToken);
        expect(TokenFlags.UnSupported & scanner.getTokenFlags()).toBeTruthy();
        expect(scanner.scan()).toBe(SyntaxKind.StringLiteral);
      });
    });
  });
  describe('v2', () => {
    const scanner = createScanner(RuntimeTarget.v2, '', undefined, true);
    test('string', () => {
      scanner.setText(`value := 'abc'`);

      expect(scanner.scan()).toBe(SyntaxKind.Identifier);
      expect(scanner.scan()).toBe(SyntaxKind.ColonEqualsToken);
      expect(scanner.scan()).toBe(SyntaxKind.StringLiteral);
    });
  });
});
