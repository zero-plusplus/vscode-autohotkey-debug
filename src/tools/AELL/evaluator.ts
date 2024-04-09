import { PrimitiveProperty, Property, Session, UnsetProperty } from '../../types/dbgp/session.types';
import { AELLEvaluator, EvaluatedValue } from '../../types/tools/AELL/evaluator.types';
import { BinaryExpression, BooleanLiteral, Expression, Identifier, NumberLiteral, StringLiteral, SyntaxKind, UnaryExpression } from '../../types/tools/autohotkey/parser/common.types';
import { createAELLParser } from './parser';
import { calc, createBooleanProperty, createNumberProperty, createStringProperty, invertBoolean, toBooleanByProperty } from './utils';

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
  async function evalStringLiteral(node: StringLiteral): Promise<PrimitiveProperty> {
    return Promise.resolve(createStringProperty(node.value));
  }
  async function evalNumberLiteral(node: NumberLiteral): Promise<PrimitiveProperty> {
    return Promise.resolve(createNumberProperty(node.value));
  }
  async function evalBooleanLiteral(node: BooleanLiteral): Promise<PrimitiveProperty> {
    return Promise.resolve(createBooleanProperty(node.text));
  }
  async function evalUnaryExpression(node: UnaryExpression): Promise<PrimitiveProperty> {
    switch (node.operator.kind) {
      case SyntaxKind.PlusToken: return calc(createNumberProperty(1), await evalNode(node.operand), (a, b) => a * b);
      case SyntaxKind.MinusToken: return calc(createNumberProperty(-1), await evalNode(node.operand), (a, b) => a * b);
      // eslint-disable-next-line no-bitwise
      case SyntaxKind.TildeToken: return calc(createNumberProperty(0), await evalNode(node.operand), (_, b) => ~b);
      case SyntaxKind.ExclamationToken: return invertBoolean(toBooleanByProperty(await evalNode(node.operand)));
      default: break;
    }
    return createStringProperty('');
  }
  async function evalBinaryExpression(node: BinaryExpression): Promise<PrimitiveProperty> {
    const leftValue = await evalNode(node.left);
    const operator = node.operator;
    const rightValue = await evalNode(node.right);
    switch (operator.text) {
      case '+': return calc(leftValue, rightValue, (a, b) => a + b);
      default: break;
    }
    return createStringProperty('');
  }
};

