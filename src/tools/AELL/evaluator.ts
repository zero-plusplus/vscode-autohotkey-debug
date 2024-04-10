import { PrimitiveProperty, Property, Session, UnsetProperty } from '../../types/dbgp/session.types';
import { AELLEvaluator, EvaluatedValue } from '../../types/tools/AELL/evaluator.types';
import { CalcCallback } from '../../types/tools/AELL/utils.types';
import { BinaryExpression, BooleanLiteral, Expression, Identifier, NumberLiteral, PostfixUnaryExpression, PrefixUnaryExpression, StringLiteral, SyntaxKind, UnaryExpression } from '../../types/tools/autohotkey/parser/common.types';
import { toSigned64BitBinary } from '../convert';
import { isFloat } from '../predicate';
import { createAELLParser } from './parser';
import { createAELLUtils } from './utils';

export const createEvaluator = (session: Session): AELLEvaluator => {
  const parser = createAELLParser(session.version);
  const {
    calc,
    createBooleanProperty,
    createNumberProperty,
    createStringProperty,
    invertBoolean,
    toBooleanPropertyByProperty,
  } = createAELLUtils(session.version);

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
      case SyntaxKind.PrefixUnaryExpression: return evalPrefixUnaryExpression(node);
      case SyntaxKind.PostfixUnaryExpression: return evalPostfixUnaryExpression(node);
      case SyntaxKind.BinaryExpression: return evalBinaryExpression(node);
      default: break;
    }
    return undefined;

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
        case SyntaxKind.ExclamationToken: return invertBoolean(toBooleanPropertyByProperty(await evalNode(node.operand)));
        default: break;
      }
      return createStringProperty('');
    }
    async function evalPrefixUnaryExpression(node: PrefixUnaryExpression): Promise<EvaluatedValue> {
      const value = await evalNode(node.operand);
      if (value === undefined) {
        return undefined;
      }
      return assignCalculatedNumber(value, (a, b) => {
        switch (node.operator.kind) {
          case SyntaxKind.PlusPlusToken: return a + b;
          case SyntaxKind.MinusMinusToken: return a - b;
          default: break;
        }
        return undefined;
      });
    }
    async function evalPostfixUnaryExpression(node: PostfixUnaryExpression): Promise<EvaluatedValue> {
      const value = await evalNode(node.operand);
      if (value === undefined) {
        return undefined;
      }
      await assignCalculatedNumber(value, (a, b) => {
        switch (node.operator.kind) {
          case SyntaxKind.PlusPlusToken: return a + b;
          case SyntaxKind.MinusMinusToken: return a - b;
          default: break;
        }
        return undefined;
      });
      return value;
    }
    async function evalBinaryExpression(node: BinaryExpression): Promise<PrimitiveProperty> {
      const leftValue = await evalNode(node.left);
      const operator = node.operator;
      const rightValue = await evalNode(node.right);
      switch (operator.text) {
        case '+': return calc(leftValue, rightValue, (a, b) => a + b);
        case '-': return calc(leftValue, rightValue, (a, b) => a - b);
        case '*': return calc(leftValue, rightValue, (a, b) => a * b);
        case '**': return calc(leftValue, rightValue, (a, b) => a ** b);
        case '/': return calc(leftValue, rightValue, (a, b) => a / b);
        case '//': return calc(leftValue, rightValue, (a, b) => {
          const containsFloat = isFloat(a) || isFloat(b);
          const result = Math.trunc(a / b);
          if (2 <= session.version.mejor && containsFloat) {
            return undefined;
          }
          return containsFloat ? Number(result.toFixed(1)) : result;
        });
        case '<<':
        case '>>':
        case '>>>': {
          return calc(leftValue, rightValue, (a, b) => {
            if (b < 0) {
              return undefined;
            }
            if (63 < b) {
              return undefined;
            }

            if (node.operator.text === '<<') {
              // eslint-disable-next-line no-bitwise
              return Math.trunc(a) << Math.trunc(b);
            }
            if (node.operator.text === '>>') {
              // eslint-disable-next-line no-bitwise
              return Math.trunc(a) >> Math.trunc(b);
            }

            const a_64bit = BigInt(`0b${toSigned64BitBinary(a)}`);
            const b_64bit = BigInt(b);
            // eslint-disable-next-line no-bitwise
            return BigInt(a_64bit >> b_64bit).toString(10);
          });
        }
        default: break;
      }
      return createStringProperty('');
    }
    async function assignCalculatedNumber(property: Property, calcCallback: CalcCallback): Promise<Property> {
      const calculated = calc(property, createNumberProperty(1), calcCallback);
      return session.setProperty({ ...property, value: calculated.value, type: 'integer' });
    }
  }
};

