import { Property, Session, UnsetProperty } from '../../types/dbgp/session.types';
import { AELLEvaluator, BooleanValue, EvaluatedValue, NumberValue, PrimitiveValue, StringValue } from '../../types/tools/AELL/evaluator.types';
import { BinaryExpression, BooleanLiteral, Expression, Identifier, NumberLiteral, StringLiteral, SyntaxKind, UnaryExpression } from '../../types/tools/autohotkey/parser/common.types';
import { createAELLParser } from './parser';
import { calc, createBooleanValue, createNumberValue, createStringValue, toNumberValue } from './utils';

export const createEvaluator = (session: Session): AELLEvaluator => {
  const parser = createAELLParser(session.version);

  return {
    eval: async(text: string): Promise<EvaluatedValue> => {
      const node = parser.parse(text);
      return evalNode(node);
    },
  };

  async function evalNode(node: Expression): Promise<EvaluatedValue> {
    switch (node.kind) {
      case SyntaxKind.Identifier: return evalIdentifier(node);
      case SyntaxKind.StringLiteral: return evalStringLiteral(node);
      case SyntaxKind.NumberLiteral: return evalNumberLiteral(node);
      case SyntaxKind.BooleanLiteral: return evalBooleanLiteral(node);
      case SyntaxKind.UnaryExpression: return evalUnaryExpression(node);
      case SyntaxKind.BinaryExpression: return evalBinaryExpression(node);
      default: break;
    }
    return undefined;
  }
  async function evalIdentifier(node: Identifier): Promise<Property> {
    const contexts = await session.getContexts();

    let unsetProperty: UnsetProperty;
    for await (const context of contexts) {
      const property = await session.getProperty(context.id, node.text);
      if (property.type === 'undefined') {
        unsetProperty = property;
        continue;
      }
      return property;
    }
    return unsetProperty!;
  }
  async function evalStringLiteral(node: StringLiteral): Promise<StringValue> {
    return Promise.resolve(createStringValue(node.value, node.text));
  }
  async function evalNumberLiteral(node: NumberLiteral): Promise<NumberValue> {
    return Promise.resolve(createNumberValue(node.value));
  }
  async function evalBooleanLiteral(node: BooleanLiteral): Promise<BooleanValue> {
    return Promise.resolve(createBooleanValue(node.text));
  }
  async function evalUnaryExpression(node: UnaryExpression): Promise<PrimitiveValue> {
    switch (node.operator.kind) {
      case SyntaxKind.PlusToken: return toNumberValue(await evalNode(node.operand)) ?? createStringValue('');
      case SyntaxKind.MinusToken: return calc(createNumberValue(-1), toNumberValue(await evalNode(node.operand)), (a, b) => a * b);
      default: break;
    }
    return createStringValue('');
  }
  async function evalBinaryExpression(node: BinaryExpression): Promise<PrimitiveValue> {
    const leftValue = await evalNode(node.left);
    const operator = node.operator;
    const rightValue = await evalNode(node.right);
    switch (operator.text) {
      case '+': return calc(leftValue, rightValue, (a, b) => a + b);
      default: break;
    }
    return createStringValue('');
  }
};

