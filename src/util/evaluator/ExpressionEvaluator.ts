/* eslint-disable no-eval */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as ohm from 'ohm-js';
import { toAST } from 'ohm-js/extras';
import { LibraryFunc, ahkRegexMatch, getFalse, getTrue, library_for_v1, library_for_v2, toBoolean } from './library';
import * as dbgp from '../../dbgpSession';
import { CaseInsensitiveMap } from '../CaseInsensitiveMap';
import { equalsIgnoreCase } from '../stringUtils';
import { ExpressionParser } from './ExpressionParser';
import { singleToDoubleString, unescapeAhk } from '../VariableManager';

export type Node =
 | IdentifierNode
 | BinaryNode
 | UnaryNode
 | DereferenceExpressionsNode
 | DereferenceExpressionNode
 | PropertyAccessNode
 | DereferencePropertyAccessNode
 | ElementAccessNode
 | CallNode
 | StringNode
 | NumberNode
 | string;

export interface NodeBase {
  type: string;
}
export interface UnaryNode extends NodeBase {
  type: 'unary';
  operator: '+' | '-' | '&' | '!' | '~';
  expression: Node;
}
export interface BinaryNode extends NodeBase {
  type: 'binary';
  left: Node;
  operator: Node;
  right: Node;
}
export interface IdentifierNode extends NodeBase {
  type: 'identifier';
  start: string;
  parts: string[];
}

export interface DereferenceExpressionsNode extends NodeBase {
  type: 'dereference_expressions';
  dereferenceExpressions: Array<IdentifierNode | DereferenceExpressionNode>;
}
export interface DereferenceExpressionNode extends NodeBase {
  type: 'dereference_expression';
  leftPercent: '%';
  expression: Node;
  rightPercent: '%';
}

export interface PropertyAccessNode extends NodeBase {
  type: 'propertyaccess';
  object: Node;
  property: Node;
}
export interface DereferencePropertyAccessNode extends NodeBase {
  type: 'dereference_propertyaccess';
  object: Node;
  property: DereferenceExpressionsNode;
}
export interface ElementAccessNode extends NodeBase {
  type: 'elementaccess';
  object: Node;
  arguments: Node[];
}
export interface CallNode extends NodeBase {
  type: 'call';
  caller: Node;
  arguments: Node[];
}
export interface StringNode extends NodeBase {
  type: 'string';
  startQuote: string;
  endQuote: string;
  value: string;
}
export interface NumberNode extends NodeBase {
  type: 'number';
  value: number;
}
export type Function = (...params: any[]) => string | number | undefined;
export type Library = {
  [key: string]: (...params: any[]) => string | number | undefined;
};
export type EvaluatedValue = string | number | dbgp.ObjectProperty;
export class EvaluatedNode {
  public readonly type: string;
  public readonly node: ohm.Node | ohm.Node[];
  public readonly value: EvaluatedValue;
  constructor(type: string, node: ohm.Node | ohm.Node[], value: EvaluatedValue) {
    this.type = type;
    this.node = node;
    this.value = value;
  }
}
const equals = async(session: dbgp.Session, stackFrame: dbgp.StackFrame | undefined, a: EvaluatedValue, b: EvaluatedValue, ignoreCase: EvaluatedValue): Promise<EvaluatedValue> => {
  const _a = a instanceof dbgp.ObjectProperty ? a.address : a;
  const _b = b instanceof dbgp.ObjectProperty ? b.address : b;
  const _ignoreCase = !(ignoreCase === '0' || ignoreCase === '');
  const result = (_ignoreCase ? equalsIgnoreCase(String(_a), String(_b)) : String(_a) === String(_b))
    ? await getTrue(session, stackFrame)
    : await getFalse(session, stackFrame);
  return result;
};
const negate = async(session: dbgp.Session, stackFrame: dbgp.StackFrame | undefined, value: EvaluatedValue): Promise<EvaluatedValue> => {
  if (value === '0') {
    return getTrue(session, stackFrame);
  }
  if (value === '') {
    return getFalse(session, stackFrame);
  }
  return value ? getFalse(session, stackFrame) : getTrue(session, stackFrame);
};
export const getContexts = async(session: dbgp.Session, stackFrame?: dbgp.StackFrame): Promise<dbgp.Context[] | undefined> => {
  let _stackFrame = stackFrame;
  if (!_stackFrame) {
    const { stackFrames } = await session.sendStackGetCommand();
    if (stackFrames.length === 0) {
      return undefined;
    }
    _stackFrame = stackFrames[0];
  }
  const { contexts } = await session.sendContextNamesCommand(_stackFrame);
  return contexts;
};
export const fetchPropertyAddress = async(session: dbgp.Session, name: string, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<number | ''> => {
  const contexts = await getContexts(session, stackFrame);
  if (!contexts) {
    return '';
  }

  for await (const context of contexts) {
    const response = await session.sendPropertyGetCommand(context, name, maxDepth);
    const property = response.properties[0] as dbgp.Property | '';
    if (property instanceof dbgp.PrimitiveProperty) {
      return '';
    }
    else if (property instanceof dbgp.ObjectProperty) {
      return property.address;
    }
  }
  return '';
};
export const fetchGlobalProperty = async(session: dbgp.Session, name: string, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> => {
  const contexts = await getContexts(session, stackFrame);
  const globalContext = contexts?.find((context) => context.name === 'Global');
  if (!globalContext) {
    return '';
  }
  const response = await session.sendPropertyGetCommand(globalContext, name, maxDepth);
  const property = response.properties[0] as dbgp.Property | '';
  if (property instanceof dbgp.ObjectProperty) {
    return property;
  }
  if (property instanceof dbgp.PrimitiveProperty) {
    return property.value;
  }
  return '';
};
export const fetchProperty = async(session: dbgp.Session, name: string, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> => {
  if (!name) {
    return '';
  }

  const contexts = await getContexts(session, stackFrame);
  if (!contexts) {
    return '';
  }

  for await (const context of contexts) {
    const response = await session.sendPropertyGetCommand(context, name, maxDepth);
    const property = response.properties[0] as dbgp.Property | undefined;
    if (property instanceof dbgp.ObjectProperty) {
      return property;
    }
    if (property instanceof dbgp.PrimitiveProperty) {
      switch (property.type) {
        case 'string': return property.value;
        case 'integer': return Number(property.value);
        case 'float': return parseFloat(property.value);
        default: break;
      }
    }
  }
  return '';
};
export const fetchPropertyChildren = async(session: dbgp.Session, stackFrame: dbgp.StackFrame | undefined, object: EvaluatedValue): Promise<dbgp.Property[] | undefined> => {
  if (!(object instanceof dbgp.ObjectProperty)) {
    return undefined;
  }

  if (!object.hasChildren) {
    return undefined;
  }
  const property = (await fetchProperty(session, object.fullName, stackFrame, 1));
  if (property instanceof dbgp.ObjectProperty) {
    return property.children;
  }
  return undefined;
};
export const fetchPropertyChild = async(session: dbgp.Session, stackFrame: dbgp.StackFrame | undefined, object: dbgp.ObjectProperty, name: EvaluatedValue): Promise<EvaluatedValue> => {
  if (!object.hasChildren) {
    return '';
  }
  const children = await fetchPropertyChildren(session, stackFrame, object);
  if (!children) {
    return '';
  }

  const property = children.find((child) => {
    if (typeof name === 'string') {
      return equalsIgnoreCase(child.name, name);
    }
    else if (typeof name === 'number') {
      return equalsIgnoreCase(child.name, `[${name}]`);
    }
    else if (child instanceof dbgp.ObjectProperty && name instanceof dbgp.ObjectProperty) {
      return child.address === name.address;
    }
    return false;
  });

  if (property instanceof dbgp.PrimitiveProperty) {
    if (property.type === 'string') {
      return property.value;
    }
    return Number(property.value);
  }
  if (property instanceof dbgp.ObjectProperty) {
    return property;
  }
  return '';
};
export class ExpressionEvaluator {
  private readonly session: dbgp.Session;
  private readonly parser: ExpressionParser;
  private readonly library: CaseInsensitiveMap<string, LibraryFunc>;
  constructor(session: dbgp.Session) {
    this.session = session;
    this.library = 2.0 <= session.ahkVersion.mejor
      ? library_for_v2
      : library_for_v1;
    this.parser = new ExpressionParser(session.ahkVersion);
  }
  public async eval(expression: string, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const matchResult = this.parser.parse(expression);
    const node = toAST(matchResult, {
      LogicalExpression_and: { type: 'binary', left: 0, operator: 1, right: 2 },
      LogicalExpression_or: { type: 'binary', left: 0, operator: 1, right: 2 },
      EqualityExpression_loose_equal: { type: 'binary', left: 0, operator: 1, right: 2 },
      EqualityExpression_not_loose_equal: { type: 'binary', left: 0, operator: 1, right: 2 },
      EqualityExpression_equal: { type: 'binary', left: 0, operator: 1, right: 2 },
      EqualityExpression_not_equal: { type: 'binary', left: 0, operator: 1, right: 2 },
      RelationalExpression_lessthan: { type: 'binary', left: 0, operator: 1, right: 2 },
      RelationalExpression_lessthan_equal: { type: 'binary', left: 0, operator: 1, right: 2 },
      RelationalExpression_greaterthan: { type: 'binary', left: 0, operator: 1, right: 2 },
      RelationalExpression_greaterthan_equal: { type: 'binary', left: 0, operator: 1, right: 2 },
      RegExMatchExpression_regex_match: { type: 'binary', left: 0, operator: 1, right: 2 },
      ConcatenateExpression_space: { type: 'binary', left: 0, operator: 1, right: 2 },
      ConcatenateExpression_dot: { type: 'binary', left: 0, operator: 1, right: 2 },
      BitwiseExpression_or: { type: 'binary', left: 0, operator: 1, right: 2 },
      BitwiseExpression_xor: { type: 'binary', left: 0, operator: 1, right: 2 },
      BitwiseExpression_and: { type: 'binary', left: 0, operator: 1, right: 2 },
      AdditiveExpression_concatenate: { type: 'binary', left: 0, operator: 1, right: 2 },
      AdditiveExpression_addition: { type: 'binary', left: 0, operator: 1, right: 2 },
      AdditiveExpression_subtraction: { type: 'binary', left: 0, operator: 1, right: 2 },
      MultiplicativeExpression_multiplication: { type: 'binary', left: 0, operator: 1, right: 2 },
      MultiplicativeExpression_division: { type: 'binary', left: 0, operator: 1, right: 2 },
      ExponentiationExpression_power: { type: 'binary', left: 0, operator: 1, right: 2 },
      DereferenceExpressions: { type: 'dereference_expressions', dereferenceExpressions: 0 },
      DereferenceExpression: { type: 'dereference_expression', leftPercent: 0, expression: 1, rightPercent: 2 },
      MemberExpression_propertyaccess: { type: 'propertyaccess', object: 0, property: 2 },
      MemberExpression_dereference_propertyaccess: { type: 'dereference_propertyaccess', object: 0, property: 2 },
      MemberExpression_elementaccess: { type: 'elementaccess', object: 0, arguments: 3 },
      UnaryExpression_positive: { type: 'unary', operator: 0, expression: 1 },
      UnaryExpression_negative: { type: 'unary', operator: 0, expression: 1 },
      UnaryExpression_not: { type: 'unary', operator: 0, expression: 1 },
      UnaryExpression_address: { type: 'unary', operator: 0, expression: 1 },
      UnaryExpression_bitwise_not: { type: 'unary', operator: 0, expression: 1 },
      CallExpression: { type: 'call', caller: 0, arguments: 2 },
      identifier: { type: 'identifier', start: 0, parts: 1 },
    }) as Node;

    const result = await this.evalNode(node, stackFrame, maxDepth);
    return result;
  }
  public async evalNode(node: Node, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    if (typeof node === 'string') {
      if (node.startsWith('"') && node.endsWith('"')) {
        return unescapeAhk(node.slice(1, -1), this.session.ahkVersion);
      }
      if (node.startsWith(`'`) && node.endsWith(`'`)) {
        return unescapeAhk(singleToDoubleString(node.slice(1, -1)), this.session.ahkVersion);
      }
      return Number(node);
    }

    switch (node.type) {
      case 'binary': return this.evalBinaryExpression(node, stackFrame, maxDepth);
      case 'identifier': return this.evalIdentifier(node, stackFrame, maxDepth);
      case 'dereference_expressions': return this.evalDeferenceExpressions(node, stackFrame, maxDepth);
      case 'dereference_expression': return this.evalDeferenceExpression(node, stackFrame, maxDepth);
      case 'propertyaccess': return this.evalPropertyAccessExpression(node, stackFrame, maxDepth);
      case 'dereference_propertyaccess': return this.evalDereferencePropertyAccessExpression(node, stackFrame, maxDepth);
      case 'elementaccess': return this.evalElementAccessExpression(node, stackFrame, maxDepth);
      case 'call': return this.evalCallExpression(node, stackFrame, maxDepth);
      case 'unary': return this.evalUnaryExpression(node, stackFrame, maxDepth);
      default: break;
    }
    return '';
  }
  public async evalUnaryExpression(node: UnaryNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    if (node.operator === '&') {
      if (typeof node.expression !== 'string' && node.expression.type === 'identifier') {
        const name = this.nodeToString(node.expression);
        const address = await fetchPropertyAddress(this.session, name ?? '', stackFrame);
        if (address) {
          return address;
        }
        throw Error('Retrieving the address of a variable with a primitive value is not supported.');
      }
      const expressionResult = this.evalNode(node.expression);
      if (expressionResult instanceof dbgp.ObjectProperty) {
        return expressionResult.address;
      }
      throw Error('Retrieving the address of a variable with a primitive value is not supported.');
    }

    const expressionResult = await this.evalNode(node.expression);
    if (equalsIgnoreCase(node.operator, 'not')) {
      return (await toBoolean(this.session, stackFrame, expressionResult))
        ? getFalse(this.session, stackFrame)
        : getTrue(this.session, stackFrame);
    }

    switch (node.operator) {
      case '!': return negate(this.session, stackFrame, expressionResult);
      case '+':
      case '-':
      case '~': {
        const _expressionResult = Number(expressionResult);
        if (Number.isNaN(_expressionResult)) {
          return '';
        }

        switch (node.operator) {
          case '+': return _expressionResult;
          case '-': return -_expressionResult;
          // eslint-disable-next-line no-bitwise
          case '~': return ~_expressionResult;
          default: break;
        }
        return '';
      }
      default: break;
    }
    return '';
  }
  public async evalBinaryExpression(node: BinaryNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const left = await this.evalNode(node.left, stackFrame, maxDepth);
    const operator = node.operator;
    const right = await this.evalNode(node.right, stackFrame, maxDepth);

    switch (operator) {
      case ' ':
      case '\t':
      case '.': {
        if (left instanceof dbgp.ObjectProperty || right instanceof dbgp.ObjectProperty) {
          return '';
        }
        const _left = String(left);
        const _right = String(right);
        return _left + _right;
      }
      case '|':
      case '^':
      case '&':
      case '+':
      case '-':
      case '*':
      case '**':
      case '/': {
        const _left = Number(left);
        const _right = Number(right);
        if (Number.isNaN(_left) || Number.isNaN(_right)) {
          return '';
        }

        switch (operator) {
          // eslint-disable-next-line no-bitwise
          case '|': return _left | _right;
          // eslint-disable-next-line no-bitwise
          case '^': return _left ^ _right;
          // eslint-disable-next-line no-bitwise
          case '&': return _left & _right;
          case '+': return _left + _right;
          case '-': return _left - _right;
          case '*': return _left * _right;
          case '**': return _left ** _right;
          case '/': return _left / _right;
          default: break;
        }
        return '';
      }
      case '=': return equals(this.session, stackFrame, left, right, '1');
      case '==': return equals(this.session, stackFrame, left, right, '0');
      case '!=': return negate(this.session, stackFrame, await equals(this.session, stackFrame, left, right, '1'));
      case '!==': return negate(this.session, stackFrame, await equals(this.session, stackFrame, left, right, '0'));
      case '<':
      case '<=':
      case '>':
      case '>=': {
        const _left = Number(left);
        const _right = Number(right);
        if (Number.isNaN(_left) || Number.isNaN(_right)) {
          return getFalse(this.session, stackFrame);
        }
        switch (operator) {
          case '<': return _left < _right ? getTrue(this.session, stackFrame) : getFalse(this.session, stackFrame);
          case '<=': return _left <= _right ? getTrue(this.session, stackFrame) : getFalse(this.session, stackFrame);
          case '>': return _left > _right ? getTrue(this.session, stackFrame) : getFalse(this.session, stackFrame);
          case '>=': return _left >= _right ? getTrue(this.session, stackFrame) : getFalse(this.session, stackFrame);
          default: break;
        }
        break;
      }
      case '&&':
      case '||': {
        const _left = left === '0' ? false : left;
        const _right = right === '0' ? false : right;
        switch (operator) {
          case '&&': {
            if (2.0 <= this.session.ahkVersion.mejor) {
              if (_left) {
                return right;
              }
              return left;
            }
            return (_left && _right) ? getTrue(this.session, stackFrame) : getFalse(this.session, stackFrame);
          }
          case '||': {
            if (2.0 <= this.session.ahkVersion.mejor) {
              return (_left || _right) ? left : right;
            }
            return (_left || _right) ? getTrue(this.session, stackFrame) : getFalse(this.session, stackFrame);
          }
          default: break;
        }
        break;
      }
      case '~=': {
        if (left instanceof dbgp.ObjectProperty || right instanceof dbgp.ObjectProperty) {
          return getFalse(this.session, stackFrame);
        }
        return ahkRegexMatch(String(left), String(right));
      }
      case '//': throw Error(`The ${operator} operator is not supported.`);
      default: break;
    }
    return '';
  }
  public async evalIdentifier(node: IdentifierNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const name = this.nodeToString(node);
    if (!name) {
      return '';
    }

    const result = await fetchProperty(this.session, name, stackFrame, maxDepth);
    return result;
  }
  public async evalDeferenceExpressions(node: DereferenceExpressionsNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    let variableName = '';
    for await (const childNode of node.dereferenceExpressions) {
      variableName += childNode.type === 'identifier'
        ? this.nodeToString(childNode)
        : await this.evalDeferenceExpression(childNode, stackFrame, maxDepth);
    }

    const result = await fetchProperty(this.session, variableName, stackFrame, maxDepth);
    return result;
  }
  public async evalDeferenceExpression(node: DereferenceExpressionNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const expression = await this.evalNode(node.expression, stackFrame, maxDepth);
    if (expression instanceof dbgp.ObjectProperty) {
      return '';
    }
    return String(expression);
  }
  public async evalPropertyAccessExpression(node: PropertyAccessNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const object = await this.evalNode(node.object, stackFrame, maxDepth);
    if (!(object instanceof dbgp.ObjectProperty)) {
      return '';
    }
    const propertyName = this.nodeToString(node.property);
    if (!propertyName) {
      return '';
    }

    const child = await fetchPropertyChild(this.session, stackFrame, object, propertyName);
    return child;
  }
  public async evalDereferencePropertyAccessExpression(node: DereferencePropertyAccessNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const object = await this.evalNode(node.object, stackFrame, maxDepth);
    if (!(object instanceof dbgp.ObjectProperty)) {
      return '';
    }
    const propertyName = await this.evalDeferenceExpressions(node.property, stackFrame, maxDepth);
    if (!propertyName) {
      return '';
    }

    const child = await fetchPropertyChild(this.session, stackFrame, object, propertyName);
    return child;
  }
  public async evalElementAccessExpression(node: ElementAccessNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const object = await this.evalNode(node.object, stackFrame, maxDepth);
    if (!(object instanceof dbgp.ObjectProperty)) {
      return '';
    }
    const evaluatedArguments = (await Promise.all(node.arguments.map(async(arg) => {
      return this.evalNode(arg, stackFrame, maxDepth);
    })));

    let currentObject: dbgp.ObjectProperty = object;
    for await (const arg of evaluatedArguments.slice(0, -1)) {
      const child = await fetchPropertyChild(this.session, stackFrame, currentObject, arg);
      if (child instanceof dbgp.ObjectProperty) {
        currentObject = child;
        continue;
      }
      break;
    }

    const property = await fetchPropertyChild(this.session, stackFrame, currentObject, evaluatedArguments[evaluatedArguments.length - 1]);
    return property;
  }
  public async evalCallExpression(node: CallNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const libraryName = this.nodeToString(node.caller);
    if (!libraryName) {
      return '';
    }
    const args = await Promise.all(node.arguments.map(async(arg) => this.evalNode(arg)));
    const library = this.library.get(libraryName);
    if (library) {
      return library(this.session, stackFrame, ...args);
    }
    return '';
  }
  public nodeToString(node: Node): string | undefined {
    if (typeof node === 'string') {
      return node;
    }

    switch (node.type) {
      case 'identifier':
        return `${node.start}${node.parts.join('')}`;
      default: break;
    }
    return '';
  }
}
