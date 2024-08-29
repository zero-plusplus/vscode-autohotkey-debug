import * as ohm from 'ohm-js';
import { toAST } from 'ohm-js/extras';
import { Parser, SyntaxKind, SyntaxNode } from '../../../../../types/tools/autohotkey/parser/common.types';

export const createParser = (grammar: ohm.Grammar, astMapping: Record<string, any>): Parser => {
  return {
    parse(input: string, startRule?: string): SyntaxNode {
      const matchResult = grammar.match(input, startRule);
      if (!matchResult.succeeded()) {
        throw new ParseError(matchResult);
      }

      const node = toAST(matchResult, astMapping);
      return node as SyntaxNode;
    },
  };
};
export const createAstMappingUtils = (): { identifierKind: (nodes: ohm.Node[]) => SyntaxKind; identifierValue: (nodes: ohm.Node[]) => string | boolean; slicedText: (start: number, end?: number) => (nodes: ohm.Node[]) => string; text: (nodes: ohm.Node[]) => string; startPosition: (nodes: ohm.Node[]) => number; endPosition: (nodes: ohm.Node[]) => number } => {
  const utils = {
    identifierKind: (nodes: ohm.Node[]): SyntaxKind => {
      const identifierName = utils.text(nodes);
      switch (identifierName.toLowerCase()) {
        case 'true':
        case 'false':
          return SyntaxKind.BooleanLiteral;
        default: break;
      }
      return SyntaxKind.Identifier;
    },
    identifierValue: (nodes: ohm.Node[]): string | boolean => {
      const identifierName = utils.text(nodes);
      switch (identifierName.toLowerCase()) {
        case 'true': return true;
        case 'false': return false;
        default: break;
      }
      return utils.text(nodes);
    },
    slicedText: (start: number, end?: number) => {
      return (nodes: ohm.Node[]): string => {
        return utils.text(nodes.slice(start, end));
      };
    },
    text: (nodes: ohm.Node[]): string => {
      return nodes.map((node) => node.source.contents).join('');
    },
    startPosition: (nodes: ohm.Node[]): number => {
      const firstNode = nodes.at(0);
      return firstNode?.source.startIdx ?? 0;
    },
    endPosition: (nodes: ohm.Node[]): number => {
      const firstNode = nodes.at(0);
      const lastNode = nodes.at(-1);
      return lastNode?.source.endIdx ?? firstNode?.source.endIdx ?? 0;
    },
  };
  return utils;
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
