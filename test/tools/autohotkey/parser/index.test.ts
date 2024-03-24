/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/explicit-function-return-type */
import { describe, expect, test } from '@jest/globals';
import { createParser } from '../../../../src/tools/autohotkey/parser';
import { SyntaxKind } from '../../../../src/types/tools/autohotkey/parser/common.types';

describe('index', () => {
  const globalKeyword = { kind: SyntaxKind.GlobalKeyword };
  const localKeyword = { kind: SyntaxKind.LocalKeyword };
  const staticKeyword = { kind: SyntaxKind.StaticKeyword };
  const identifier = { kind: SyntaxKind.Identifier };
  const stringLiteral = { kind: SyntaxKind.StringLiteral };
  const numberLiteral = { kind: SyntaxKind.NumberLiteral };
  const token = (text) => {
    switch (text) {
      case '+': return { kind: SyntaxKind.PlusToken };
      case '*': return { kind: SyntaxKind.AsteriskToken };
      case '**': return { kind: SyntaxKind.AsteriskAsteriskToken };
      case ':=': return { kind: SyntaxKind.ColonEqualsToken };
      default: break;
    }
    throw Error();
  };
  const binary = (left, operator, right) => ({ kind: SyntaxKind.BinaryExpression, left, operator, right });
  const varDeclaration = (declarators, modifier?) => ({ kind: SyntaxKind.VariableDeclaration, modifier: modifier ?? null, declarators });
  const varDeclarator = (name, initializer) => ({ kind: SyntaxKind.VariableDeclarator, name, operator: token(':='), initializer });
  const source = (statements) => ({ kind: SyntaxKind.SourceFile, statements });

  describe('v1_0', () => {
    const parser = createParser('1.0.0');
    test.each`
      text                  | expected
      ${'"abc"'}            | ${stringLiteral}
      ${'1 + 1'}            | ${binary(numberLiteral, token('+'), numberLiteral)}
      ${'1 * 1 + 1 * 1'}    | ${binary(binary(numberLiteral, token('*'), numberLiteral), token('+'), binary(numberLiteral, token('*'), numberLiteral))}
      ${'1 ** 1 * 1 ** 1'}  | ${binary(binary(numberLiteral, token('**'), numberLiteral), token('*'), binary(numberLiteral, token('**'), numberLiteral))}
    `('expression', ({ text, expected }) => {
      const actual = parser.parseExpression(String(text));
      expect(actual).toMatchObject(expected as Record<string, any>);
    });

    test.each`
      text                    | expected
      ${'a := ""'}            | ${source([ varDeclaration([ varDeclarator(identifier, stringLiteral) ]) ])}
      ${'a := "", b := ""'}   | ${source([ varDeclaration([ varDeclarator(identifier, stringLiteral), varDeclarator(identifier, stringLiteral) ]) ])}
      ${'global a := ""'}     | ${source([ varDeclaration([ varDeclarator(identifier, stringLiteral) ], globalKeyword) ])}
      ${'local a := ""'}     | ${source([ varDeclaration([ varDeclarator(identifier, stringLiteral) ], localKeyword) ])}
      ${'static a := ""'}     | ${source([ varDeclaration([ varDeclarator(identifier, stringLiteral) ], staticKeyword) ])}
    `('VariableDeclaration', ({ text, expected }) => {
      const actual = parser.parse(String(text));
      expect(actual).toMatchObject(expected as Record<string, any>);
    });
  });
});
