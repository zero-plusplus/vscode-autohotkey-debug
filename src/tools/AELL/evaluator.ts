import { PrimitiveProperty, Property, Session, UnsetProperty } from '../../types/dbgp/session.types';
import { AELLEvaluator, EvaluatedValue } from '../../types/tools/AELL/evaluator.types';
import { CalcCallback } from '../../types/tools/AELL/utils.types';
import { BinaryExpression, BooleanLiteral, ElementAccessExpression, Expression, Identifier, NumberLiteral, PostfixUnaryExpression, PrefixUnaryExpression, PropertyAccessExpression, StringLiteral, SyntaxKind, UnaryExpression } from '../../types/tools/autohotkey/parser/common.types';
import { toSigned64BitBinary } from '../convert';
import { isFloat } from '../predicate';
import { createAELLParser } from './parser';
import { createAELLUtils } from './utils';

export const createEvaluator = (session: Session): AELLEvaluator => {
  const version = session.version;
  const parser = createAELLParser(version);
  const {
    calc,
    createBooleanProperty,
    createUnsetProperty,
    createNumberProperty,
    createStringProperty,
    equiv,
    invertBoolean,
    toBooleanPropertyByProperty,
  } = createAELLUtils(version);

  return {
    eval: async(text: string): Promise<EvaluatedValue> => {
      const node = parser.parse(text);
      return evalNode(node);
    },
  };

  async function evalNode(node: Expression): Promise<Property> {
    switch (node.kind) {
      case SyntaxKind.Identifier: return evalIdentifier(node);
      case SyntaxKind.StringLiteral: return evalStringLiteral(node);
      case SyntaxKind.NumberLiteral: return evalNumberLiteral(node);
      case SyntaxKind.BooleanLiteral: return evalBooleanLiteral(node);
      case SyntaxKind.PropertyAccessExpression: return evalPropertyAccessExpression(node);
      case SyntaxKind.ElementAccessExpression: return evalElementAccessExpression(node);
      case SyntaxKind.UnaryExpression: return evalUnaryExpression(node);
      case SyntaxKind.PrefixUnaryExpression: return evalPrefixUnaryExpression(node);
      case SyntaxKind.PostfixUnaryExpression: return evalPostfixUnaryExpression(node);
      case SyntaxKind.BinaryExpression: return evalBinaryExpression(node);
      default: break;
    }
    return createUnsetProperty('');

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
    async function evalPropertyAccessExpression(node: PropertyAccessExpression): Promise<Property> {
      const object = await evalNode(node.object);
      const keyProperty = await evalNode(node.property);
      const key = keyProperty.type === 'object' ? String(keyProperty.address) : keyProperty.name;

      const child = await getPropertyByPrototypeChain(object, key);
      child.fullName = node.text;
      child.name = node.text.slice((node.object.endPosition - node.object.startPosition) + '.'.length);
      return child;
    }
    async function evalElementAccessExpression(node: ElementAccessExpression): Promise<Property> {
      const object = await evalNode(node.object);

      let currentProperty: Property = object;
      for await (const element of node.elements) {
        const keyProperty = await evalNode(element);
        const key = keyProperty.type === 'object' ? String(keyProperty.address) : keyProperty.value;

        currentProperty = await getPropertyByPrototypeChain(currentProperty, key);
      }

      currentProperty.fullName = node.text;
      currentProperty.name = node.text.slice(node.object.endPosition - node.object.startPosition);
      return currentProperty;
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

      return assignCalculatedNumber(value, (a, b) => {
        switch (node.operator.kind) {
          case SyntaxKind.PlusPlusToken: return a + b;
          case SyntaxKind.MinusMinusToken: return a - b;
          default: break;
        }
        return undefined;
      });
    }
    async function evalPostfixUnaryExpression(node: PostfixUnaryExpression): Promise<Property> {
      const value = await evalNode(node.operand);

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
        // eslint-disable-next-line no-bitwise
        case '&': return calc(leftValue, rightValue, (a, b) => a & b);
        // eslint-disable-next-line no-bitwise
        case '^': return calc(leftValue, rightValue, (a, b) => a ^ b);
        // eslint-disable-next-line no-bitwise
        case '|': return calc(leftValue, rightValue, (a, b) => a | b);
        case '=': return equiv(leftValue, rightValue, (a, b) => String(a).toLowerCase() === String(b).toLowerCase());
        case '==': return equiv(leftValue, rightValue, (a, b) => String(a) === String(b));
        case '!=': return equiv(leftValue, rightValue, (a, b) => String(a).toLowerCase() !== String(b).toLowerCase());
        case '!==': {
          if (2 <= version.mejor) {
            return equiv(leftValue, rightValue, (a, b) => String(a) !== String(b));
          }
          return createStringProperty('');
        }
        default: break;
      }
      return createStringProperty('');
    }
    async function assignCalculatedNumber(property: Property, calcCallback: CalcCallback): Promise<Property> {
      const calculated = calc(property, createNumberProperty(1), calcCallback);
      return session.setProperty({ ...property, value: calculated.value, type: 'integer' });
    }
    async function getPropertyByPrototypeChain(object: Property, key: string): Promise<Property> {
      const fullName = `${object.fullName}.${key}`;
      if (object.type !== 'object') {
        return createUnsetProperty(fullName, object.contextId, object.depth);
      }

      const child = object.children.find((child) => child.fullName.toLowerCase() === fullName.toLowerCase()) ?? await session.getProperty(object.contextId, fullName);
      if (child.type !== 'undefined') {
        return child;
      }

      const baseProperty = await session.getProperty(object.contextId, `${object.fullName}.<base>`, object.depth);
      if (baseProperty.type === 'undefined') {
        return createUnsetProperty(key, baseProperty.contextId, baseProperty.depth);
      }
      return getPropertyByPrototypeChain(baseProperty, key);
    }
  }
};

