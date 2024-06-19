import { getContexts, getProperty, setProperty } from '../../dap/runtime/context';
import * as dbgp from '../../types/dbgp/AutoHotkeyDebugger.types';
import { PrimitiveProperty, Property, PseudoPrimitiveProperty, Session } from '../../types/dbgp/session.types';
import { AELLEvaluator, EvaluatedValue } from '../../types/tools/AELL/evaluator.types';
import { CalcCallback } from '../../types/tools/AELL/utils.types';
import { BinaryExpression, BooleanLiteral, CustomNode, ElementAccessExpression, Expression, Identifier, NumberLiteral, PostfixUnaryExpression, PrefixUnaryExpression, PropertyAccessExpression, StringLiteral, SyntaxKind, UnaryExpression } from '../../types/tools/autohotkey/parser/common.types';
import { toSigned64BitBinary } from '../convert';
import { createAELLParser } from './parser';
import { createQueryTransformer } from './transformer/query';
import { createAELLUtils, isQueryNode } from './utils';

export const createEvaluator = (session: Session, warningReporter?: (message: string) => void): AELLEvaluator => {
  const ahkVersion = session.ahkVersion;
  const isV1 = ahkVersion.mejor < 2;
  const isV2 = 2 <= ahkVersion.mejor;
  const queryOptimizer = createQueryTransformer(ahkVersion);

  const parser = createAELLParser(ahkVersion);
  const {
    calc,
    createBooleanProperty,
    createUnsetProperty,
    createNumberProperty,
    createStringProperty,
    equiv,
    invertBoolean,
    toBooleanPropertyByProperty,
  } = createAELLUtils(ahkVersion);

  return {
    eval: async(text: string): Promise<EvaluatedValue> => {
      const node = parser.parse(text);
      return evalNode(node);
    },
  };

  async function evalNode(node: Expression): Promise<EvaluatedValue> {
    const optimizedNode = queryOptimizer.transform(node);
    switch (optimizedNode.kind) {
      case SyntaxKind.Identifier: return evalIdentifier(optimizedNode);
      case SyntaxKind.StringLiteral: return evalStringLiteral(optimizedNode);
      case SyntaxKind.NumberLiteral: return evalNumberLiteral(optimizedNode);
      case SyntaxKind.BooleanLiteral: return evalBooleanLiteral(optimizedNode);
      case SyntaxKind.PropertyAccessExpression: return evalPropertyAccessExpression(optimizedNode);
      case SyntaxKind.ElementAccessExpression: return evalElementAccessExpression(optimizedNode);
      case SyntaxKind.UnaryExpression: return evalUnaryExpression(optimizedNode);
      case SyntaxKind.PrefixUnaryExpression: return evalPrefixUnaryExpression(optimizedNode);
      case SyntaxKind.PostfixUnaryExpression: return evalPostfixUnaryExpression(optimizedNode);
      case SyntaxKind.BinaryExpression: return evalBinaryExpression(optimizedNode);
      case SyntaxKind.Custom: return evalCustomNode(optimizedNode);
      default: break;
    }
    return createUnsetProperty('');

    async function evalIdentifier(node: Identifier): Promise<EvaluatedValue> {
      const contexts = await getContexts(session);

      let unsetProperty: PrimitiveProperty;
      for await (const context of contexts) {
        const property = await requestQuery(node.text, context.id);
        if (property.type === 'undefined') {
          unsetProperty = property;
          continue;
        }
        return property;
      }
      return unsetProperty!;
    }
    async function evalStringLiteral(node: StringLiteral): Promise<PrimitiveProperty | PseudoPrimitiveProperty> {
      return Promise.resolve(createStringProperty(node.value));
    }
    async function evalNumberLiteral(node: NumberLiteral): Promise<PrimitiveProperty | PseudoPrimitiveProperty> {
      return Promise.resolve(createNumberProperty(node.text));
    }
    async function evalBooleanLiteral(node: BooleanLiteral): Promise<PrimitiveProperty | PseudoPrimitiveProperty> {
      return Promise.resolve(createBooleanProperty(node.text));
    }
    async function evalPropertyAccessExpression(node: PropertyAccessExpression): Promise<EvaluatedValue> {
      const object = await evalNode(node.object);
      const keyProperty = await evalNode(node.property);
      const key = keyProperty.type === 'object' ? `[Object(${String(keyProperty.address)}]` : node.property.text;

      const query = keyProperty.type === 'object' ? `${object.fullName}${key}` : `${object.fullName}.${key}`;
      const child = await requestQuery(query);
      // child.fullName = node.text;
      // child.name = node.property.text;
      return child;
    }
    async function evalElementAccessExpression(node: ElementAccessExpression): Promise<EvaluatedValue> {
      const object = await evalNode(node.object);

      const args: string[] = [];
      for await (const element of node.elements) {
        const keyProperty = await evalNode(element);
        const key = keyProperty.type === 'object' ? `Object(${String(keyProperty.address)})` : keyProperty.value;

        args.push(key);
      }

      const query = `${object.fullName}[${args.join(', ')}]`;
      const child = await requestQuery(query);
      child.fullName = node.text;
      child.name = node.text.slice(node.object.endPosition - node.object.startPosition);
      return child;
    }
    async function evalUnaryExpression(node: UnaryExpression): Promise<PrimitiveProperty | PseudoPrimitiveProperty> {
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
    async function evalPostfixUnaryExpression(node: PostfixUnaryExpression): Promise<EvaluatedValue> {
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
    async function evalBinaryExpression(node: BinaryExpression): Promise<PrimitiveProperty | PseudoPrimitiveProperty> {
      const leftValue = await evalNode(node.left);
      const operator = node.operator;
      const rightValue = await evalNode(node.right);
      switch (operator.text) {
        case '+': return calc(leftValue, rightValue, (a, b) => a + b);
        case '-': return calc(leftValue, rightValue, (a, b) => a - b);
        case '*': return calc(leftValue, rightValue, (a, b) => a * b);
        case '**': return calc(leftValue, rightValue, (a, b) => a ** b);
        case '/': return calc(leftValue, rightValue, (a, b) => a / b);
        case '//': return calc(leftValue, rightValue, (a, b, [ a_type, b_type ]) => {
          const containsFloat = a_type === 'float' || b_type === 'float';
          if (isV2 && containsFloat) {
            throwError(`The "${node.operator.text}" operator does not support float value.`);
            return undefined;
          }

          const result = Math.trunc(a / b);
          return containsFloat ? result.toFixed(1) : result;
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
          if (isV1) {
            return throwError(`The "${node.operator.text}" operator is not supported.`);
          }
          return equiv(leftValue, rightValue, (a, b) => String(a) !== String(b));
        }
        default: break;
      }
      return throwError(`An unknown operator "${node.operator.text}" was specified.`);
    }
    // #region utils
    async function assignCalculatedNumber(property: EvaluatedValue, calcCallback: CalcCallback): Promise<Property> {
      const calculated = calc(property, createNumberProperty(1), calcCallback);
      return setProperty(session, property.name, calculated.value, 'integer', property.contextId === -1 ? 0 : property.contextId);
    }
    async function evalCustomNode(node: CustomNode): Promise<EvaluatedValue> {
      if (isQueryNode(node)) {
        return requestQuery(node);
      }
      return createUnsetProperty('');
    }
    async function requestQuery(queryOrNode: string | (CustomNode & { query: string; name?: string }), contextId?: dbgp.ContextId): Promise<Property> {
      const query = typeof queryOrNode === 'string' ? queryOrNode : queryOrNode.query;
      // console.log(query);
      const property = await getProperty(session, query, contextId);
      if (property === undefined) {
        return {
          constant: true,
          contextId,
          stackLevel: 0,
          name: typeof queryOrNode === 'object' ? (queryOrNode.name ?? query) : query,
          fullName: query,
          type: 'undefined',
          value: '',
          size: 0,
        } as PrimitiveProperty;
      }

      // https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/326#issuecomment-2088898249
      if ((property.fullName && property.name) && (typeof queryOrNode === 'object' && 'name' in queryOrNode && typeof queryOrNode.name === 'string')) {
        property.name = queryOrNode.name;
      }
      return property;
    }
    // #endregion utils
  }
  function throwError(message?: string): PseudoPrimitiveProperty {
    if (ahkVersion.mejor < 2) {
      if (message) {
        warningReporter?.(message);
      }
      return createStringProperty('') as PseudoPrimitiveProperty;
    }
    throw Error(message);
  }
};

