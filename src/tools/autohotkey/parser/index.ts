import * as ohm from 'ohm-js';
import { ParsedAutoHotkeyVersion } from '../../../types/tools/autohotkey/version/common.types';
import { parseAutoHotkeyVersion } from '../version';
import * as v1_0 from './grammars/v1_0';
import { toAST } from 'ohm-js/extras';
import { SyntaxNode } from '../../../types/tools/autohotkey/parser/common.types';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createParser = (ahkVersionOrText: string | ParsedAutoHotkeyVersion) => {
  const ahkVersion = typeof ahkVersionOrText === 'string' ? parseAutoHotkeyVersion(ahkVersionOrText) : ahkVersionOrText;
  const grammar = ((): ohm.Grammar => {
    if (ahkVersion.mejor === 2.1) {
      return v1_0.grammar;
    }
    if (ahkVersion.mejor === 2.0) {
      return v1_0.grammar;
    }
    return v1_0.grammar;
  })();

  return {
    parse(input: string, startRule = 'SourceFile'): SyntaxNode {
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      const matchResult = grammar.match(input, startRule);
      if (!matchResult.succeeded()) {
        throw new ParseError(matchResult);
      }

      const node = toAST(matchResult, v1_0.astMapping);
      return node as SyntaxNode;
    },
    parseExpression(input: string): SyntaxNode {
      return this.parse(input, 'Expression');
    },
    parseExpressions(input: string): SyntaxNode {
      return this.parse(input, 'Expressions');
    },
  };
};

export class ParseError extends Error {
  public readonly message: string;
  public readonly shortMessage: string;
  constructor(matchResult: ohm.MatchResult) {
    super();

    this.message = matchResult.message ?? '';
    this.shortMessage = matchResult.shortMessage ?? '';
  }
  public get expected(): string {
    const message = this.message.split('\n')[3] ?? '';
    const match = message.match(/(?<=Expected\s)(?<expected>.+)$/ui);
    if (!match?.groups?.expected) {
      return '';
    }
    const expected = match.groups.expected
      .replace(/(?<!\\)"/gu, '`')
      .replace(/\\"/gu, '"');
    return `Expected ${expected}`;
  }
}
