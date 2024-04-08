import { Session } from '../../types/dbgp/session.types';
import { AELLEvaluator, BooleanValue, EvaluatedValue, NumberValue, StringValue } from '../../types/tools/AELL/evaluator.types';
import { BooleanLiteral, NumberLiteral, StringLiteral, SyntaxKind, SyntaxNode } from '../../types/tools/autohotkey/parser/common.types';
import { createAELLParser } from './parser';

export const createEvaluator = (session: Session): AELLEvaluator => {
  const parser = createAELLParser(session.version);

  return {
    eval: async(text: string): Promise<EvaluatedValue> => {
      const node = parser.parse(text);
      return evalNode(node);
    },
  };

  async function evalNode(node: SyntaxNode): Promise<EvaluatedValue> {
    switch (node.kind) {
      case SyntaxKind.StringLiteral: return evalStringLiteral(node);
      case SyntaxKind.NumberLiteral: return evalNumberLiteral(node);
      case SyntaxKind.BooleanLiteral: return evalBooleanLiteral(node);
      default: break;
    }
    return undefined;
  }
  async function evalStringLiteral(node: StringLiteral): Promise<StringValue> {
    return Promise.resolve({
      kind: node.kind,
      type: 'string',
      value: node.value,
      text: node.text,
    });
  }
  async function evalNumberLiteral(node: NumberLiteral): Promise<NumberValue> {
    return Promise.resolve({
      kind: node.kind,
      type: node.text.includes('.') ? 'float' : 'integer',
      value: Number(node.value),
      text: node.text,
    });
  }
  async function evalBooleanLiteral(node: BooleanLiteral): Promise<BooleanValue> {
    const bool = node.text.toLowerCase() === 'true';
    return Promise.resolve({
      kind: node.kind,
      type: 'string',
      value: bool ? '1' : '0',
      bool,
      text: node.text,
    });
  }
};

