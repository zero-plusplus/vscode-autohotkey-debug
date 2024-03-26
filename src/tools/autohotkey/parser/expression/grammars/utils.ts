import * as ohm from 'ohm-js';
import { toAST } from 'ohm-js/extras';
import { Parser, SyntaxNode } from '../../../../../types/tools/autohotkey/parser/common.types';

export const createParser = (grammar: ohm.Grammar, astMapping: Record<string, any>): Parser => {
  return {
    parse(input: string, startRule?: string): SyntaxNode {
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      const matchResult = grammar.match(input, startRule);
      if (!matchResult.succeeded()) {
        throw new ParseError(matchResult);
      }

      const node = toAST(matchResult, astMapping);
      return node as SyntaxNode;
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
