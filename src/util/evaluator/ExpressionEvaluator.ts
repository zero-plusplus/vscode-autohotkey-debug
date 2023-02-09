/* eslint-disable no-eval */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as ohm from 'ohm-js';
import { toAST } from 'ohm-js/extras';
import { LibraryFunc, ahkRegexMatch, getFalse, getTrue, library_for_v1, library_for_v2 } from './library';
import * as dbgp from '../../dbgpSession';
import { CaseInsensitiveMap } from '../CaseInsensitiveMap';
import { equalsIgnoreCase } from '../stringUtils';
import { ExpressionParser } from './ExpressionParser';
import { MetaVariable, MetaVariableValueMap, singleToDoubleString, unescapeAhk } from '../VariableManager';
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import { isNumberLike, isPrimitive } from '../util';
import { uniqBy } from 'lodash';

export type Node =
 | IdentifierNode
 | AssignmentNode
 | BinaryNode
 | UnaryNode
 | PrefixUnaryNode
 | PostfixUnaryNode
 | TernaryNode
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
  operator: '+' | '-' | '&' | '!' | '~' | '*';
  expression: Node;
}
export interface PrefixUnaryNode extends NodeBase {
  type: 'prefix_unary';
  operator: '++' | '--';
  expression: Node;
}
export interface PostfixUnaryNode extends NodeBase {
  type: 'postfix_unary';
  expression: Node;
  operator: '++' | '--';
}
export interface TernaryNode extends NodeBase {
  type: 'ternary';
  condition: Node;
  whenTrue: Node;
  whenFalse: Node;
}
export interface AssignmentNode extends NodeBase {
  type: 'assign';
  left: Node;
  operator: ':=';
  right: Node;
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
export type EvaluatedValue = undefined | string | number | dbgp.ObjectProperty | MetaVariable;
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
export const getFullName = (nameOrObject: string | dbgp.ObjectProperty): string => {
  return typeof nameOrObject === 'string' ? nameOrObject : nameOrObject.fullName;
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
export const toType = (version: AhkVersion, value: EvaluatedValue): dbgp.PropertyType => {
  if (isNumberLike(value)) {
    if ((/^0x/iu).test(String(value))) {
      return 'integer';
    }
    if (String(value).includes('.') || (/[eE]/u).test(String(value))) {
      return 2.0 <= version.mejor ? 'float' : 'string';
    }
    return 'integer';
  }
  else if (typeof value === 'string') {
    return 'string';
  }

  if (value instanceof dbgp.ObjectProperty) {
    return 'object';
  }

  if (value instanceof MetaVariable) {
    if (typeof value === 'string') {
      return 'string';
    }

    if (isPrimitive(value.value)) {
      return toType(version, value.value);
    }
    return 'object';
  }

  if (typeof value !== 'undefined') {
    return 'object';
  }
  return 'undefined';
};
export const toAutohotkeyNumber = (version: AhkVersion, value: EvaluatedValue): string | number => {
  if (isNumberLike(value)) {
    if ((/^0x/iu).test(String(value))) {
      return Number(value);
    }
    else if ((/[eE]/u).test(String(value))) {
      return 2.0 <= version.mejor ? Number(value) : String(value);
    }
    else if (String(value).includes('.')) {
      return 2.0 <= version.mejor ? Number(value) : String(value);
    }
    return Number(value);
  }
  return '';
};
export const toJavaScriptBoolean = (result: EvaluatedValue): boolean => {
  if (result === '0') {
    return false;
  }
  return Boolean(result);
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
    if (property.type === 'undefined') {
      return undefined;
    }
    return property.value;
  }
  return '';
};
export const fetchPropertyByContext = async(session: dbgp.Session, context: dbgp.Context, name: string, maxDepth = 1): Promise<EvaluatedValue> => {
  if (!name) {
    return undefined;
  }

  const response = await session.sendPropertyGetCommand(context, name, maxDepth);
  const property = response.properties[0] as dbgp.Property | undefined;
  if (property instanceof dbgp.ObjectProperty) {
    return property;
  }
  if (property instanceof dbgp.PrimitiveProperty) {
    switch (property.type) {
      case 'undefined': return undefined;
      case 'string': return property.value;
      case 'integer': return Number(property.value);
      case 'float': return parseFloat(property.value);
      default: break;
    }
  }
  return undefined;
};
export const fetchProperty = async(session: dbgp.Session, name: string, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> => {
  const contexts = await getContexts(session, stackFrame);
  if (!contexts) {
    return undefined;
  }

  for await (const context of contexts) {
    const value = await fetchPropertyByContext(session, context, name, maxDepth);
    if (typeof value !== 'undefined') {
      return value;
    }
  }
  return undefined;
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
    return undefined;
  }
  const children = await fetchPropertyChildren(session, stackFrame, object);
  if (!children) {
    return undefined;
  }

  const property = children.find((child) => {
    const childName = child.name.replace(/^\["(.*)"\]$/u, '$1');
    if (typeof name === 'string') {
      return equalsIgnoreCase(childName, name);
    }
    else if (typeof name === 'number') {
      return equalsIgnoreCase(childName, `[${name}]`);
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
  return undefined;
};
export const fetchInheritedProperty = async(session: dbgp.Session, stackFrame: dbgp.StackFrame | undefined, object: dbgp.ObjectProperty, key: string): Promise<EvaluatedValue | undefined> => {
  const child = await fetchPropertyChild(session, stackFrame, object, key);
  if (typeof child !== 'undefined') {
    return child;
  }

  const baseProperty = await fetchProperty(session, `${object.fullName}.<base>`, stackFrame);
  if (baseProperty instanceof dbgp.ObjectProperty) {
    const property = await fetchProperty(session, `${baseProperty.fullName}.${key}`, stackFrame);
    if (property) {
      return property;
    }
    return fetchInheritedProperty(session, stackFrame, baseProperty, key);
  }
  return undefined;
};
export const fetchInheritedProperties = async(session: dbgp.Session, stackFrame: dbgp.StackFrame | undefined, object: dbgp.ObjectProperty): Promise<dbgp.Property[]> => {
  const children = await fetchPropertyChildren(session, stackFrame, object) ?? [];
  const base = await fetchProperty(session, `${object.fullName}.<base>`, stackFrame);
  if (base instanceof dbgp.ObjectProperty) {
    const nestedChildren = (await fetchInheritedProperties(session, stackFrame, base));
    children.push(...nestedChildren);
  }
  return uniqBy(children, (property) => property.name.replace(/^<|>$/gu, '').toLocaleLowerCase());
};
export const setProperty = async(session: dbgp.Session, context: dbgp.Context, nameOrObject: string | dbgp.ObjectProperty, value: string | number): Promise<boolean> => {
  const fullName = getFullName(nameOrObject);
  const data = String(value);

  let typeName: dbgp.PropertyType = 'string';
  if (typeof value === 'number') {
    typeName = data.includes('.') ? 'string' : 'integer';
    if (2.0 <= session.ahkVersion.mejor) {
      typeName = data.includes('.') ? 'float' : 'integer';
    }
  }

  const result = await session.sendPropertySetCommand({
    context,
    data,
    typeName,
    fullName,
  });
  if (result.success) {
    return true;
  }
  throw Error(`Failed to rewrite \`${fullName}\`. Probably read-only.`);
};
export const simulateSetProperty = async(session: dbgp.Session, stackFrame: dbgp.StackFrame | undefined, nameOrObject: string | dbgp.ObjectProperty, value: string | number): Promise<void> => {
  const contexts = await getContexts(session, stackFrame);
  if (!contexts || contexts.length === 0) {
    return;
  }

  const inFunction = contexts[0].stackFrame.name.endsWith('()');
  if (inFunction) {
    const localContext = contexts.find((context) => context.name === 'Local');
    if (!localContext) {
      return;
    }

    await setProperty(session, localContext, nameOrObject, value);
    return;
  }

  const globalContext = contexts.find((context) => context.name === 'Global');
  if (!globalContext) {
    return;
  }
  await setProperty(session, globalContext, nameOrObject, value);
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
export class ExpressionEvaluator {
  public readonly session: dbgp.Session;
  private readonly metaVariableMap: MetaVariableValueMap;
  private readonly parser: ExpressionParser;
  private readonly library: CaseInsensitiveMap<string, LibraryFunc>;
  constructor(session: dbgp.Session, metaVariableMap?: MetaVariableValueMap) {
    this.session = session;
    this.metaVariableMap = metaVariableMap ?? new MetaVariableValueMap();
    this.library = 2.0 <= session.ahkVersion.mejor
      ? library_for_v2
      : library_for_v1;
    this.parser = new ExpressionParser(session.ahkVersion);
  }
  public async eval(expression: string, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const matchResult = this.parser.parse(expression);
    if (!matchResult.succeeded()) {
      throw new ParseError(matchResult);
    }

    const node = toAST(matchResult, {
      Expression_comma_sequence: { type: 'binary', left: 0, operator: 1, right: 2 },
      AssignmentExpression_assign: { type: 'assign', left: 0, operator: 1, right: 2 },
      ReAssignmentExpression_addition: { type: 'binary', left: 0, operator: 1, right: 2 },
      ReAssignmentExpression_subtraction: { type: 'binary', left: 0, operator: 1, right: 2 },
      ReAssignmentExpression_multiplication: { type: 'binary', left: 0, operator: 1, right: 2 },
      ReAssignmentExpression_division: { type: 'binary', left: 0, operator: 1, right: 2 },
      ReAssignmentExpression_floor_division: { type: 'binary', left: 0, operator: 1, right: 2 },
      ReAssignmentExpression_concatenate: { type: 'binary', left: 0, operator: 1, right: 2 },
      ReAssignmentExpression_bitwise_or: { type: 'binary', left: 0, operator: 1, right: 2 },
      ReAssignmentExpression_bitwise_xor: { type: 'binary', left: 0, operator: 1, right: 2 },
      ReAssignmentExpression_bitwise_and: { type: 'binary', left: 0, operator: 1, right: 2 },
      ReAssignmentExpression_bitshift_left: { type: 'binary', left: 0, operator: 1, right: 2 },
      ReAssignmentExpression_bitshift_right: { type: 'binary', left: 0, operator: 1, right: 2 },
      ReAssignmentExpression_bitshift_logical_right: { type: 'binary', left: 0, operator: 1, right: 2 },
      LogicalOrExpression_or: { type: 'binary', left: 0, operator: 1, right: 2 },
      LogicalAndExpression_and: { type: 'binary', left: 0, operator: 1, right: 2 },
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
      ConcatenateExpression_dot: { type: 'binary', left: 0, operator: 2, right: 4 },
      BitwiseExpression_or: { type: 'binary', left: 0, operator: 1, right: 2 },
      BitwiseExpression_xor: { type: 'binary', left: 0, operator: 1, right: 2 },
      BitwiseExpression_and: { type: 'binary', left: 0, operator: 1, right: 2 },
      BitshiftExpression_left: { type: 'binary', left: 0, operator: 1, right: 2 },
      BitshiftExpression_right: { type: 'binary', left: 0, operator: 1, right: 2 },
      BitshiftExpression_logical_left: { type: 'binary', left: 0, operator: 1, right: 2 },
      BitshiftExpression_logical_right: { type: 'binary', left: 0, operator: 1, right: 2 },
      AdditiveExpression_concatenate: { type: 'binary', left: 0, operator: 1, right: 2 },
      AdditiveExpression_addition: { type: 'binary', left: 0, operator: 1, right: 2 },
      AdditiveExpression_subtraction: { type: 'binary', left: 0, operator: 1, right: 2 },
      MultiplicativeExpression_multiplication: { type: 'binary', left: 0, operator: 1, right: 2 },
      MultiplicativeExpression_division: { type: 'binary', left: 0, operator: 1, right: 2 },
      ExponentiationExpression_power: { type: 'binary', left: 0, operator: 1, right: 2 },
      DereferenceExpressions: { type: 'dereference_expressions', dereferenceExpressions: 0 },
      DereferenceExpression: { type: 'dereference_expression', leftPercent: 0, expression: 1, rightPercent: 2 },
      CallExpression_call: { type: 'call', caller: 0, arguments: 2 },
      CallExpression_propertyaccess: { type: 'propertyaccess', object: 0, property: 2 },
      CallExpression_elementaccess: { type: 'elementaccess', object: 0, arguments: 3 },
      MemberExpression_propertyaccess: { type: 'propertyaccess', object: 0, property: 2 },
      MemberExpression_dereference_propertyaccess: { type: 'dereference_propertyaccess', object: 0, property: 2 },
      MemberExpression_elementaccess: { type: 'elementaccess', object: 0, arguments: 3 },
      UnaryExpression_positive: { type: 'unary', operator: 0, expression: 1 },
      UnaryExpression_negative: { type: 'unary', operator: 0, expression: 1 },
      UnaryExpression_not: { type: 'unary', operator: 0, expression: 1 },
      UnaryExpression_address: { type: 'unary', operator: 0, expression: 1 },
      UnaryExpression_bitwise_not: { type: 'unary', operator: 0, expression: 1 },
      UnaryExpression_dereference: { type: 'unary', operator: 0, expression: 1 },
      UnaryExpression_increment: { type: 'prefix_unary', operator: 0, expression: 1 },
      UnaryExpression_decrement: { type: 'prefix_unary', operator: 0, expression: 1 },
      PostfixUnaryExpression_increment: { type: 'postfix_unary', expression: 0, operator: 1 },
      PostfixUnaryExpression_decrement: { type: 'postfix_unary', expression: 0, operator: 1 },
      TernaryExpression_ternary: { type: 'ternary', condition: 0, whenTrue: 2, whenFalse: 4 },
      booleanLiteral: { type: 'identifier', start: 0, parts: 1 },
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
      return toAutohotkeyNumber(this.session.ahkVersion, node);
    }

    switch (node.type) {
      case 'assign': return this.evalAssignmentExpression(node, stackFrame, maxDepth);
      case 'binary': return this.evalBinaryExpression(node, stackFrame, maxDepth);
      case 'identifier': return this.evalIdentifier(node, stackFrame, maxDepth);
      case 'dereference_expressions': return this.evalDeferenceExpressions(node, stackFrame, maxDepth);
      case 'dereference_expression': return this.evalDeferenceExpression(node, stackFrame, maxDepth);
      case 'propertyaccess': return this.evalPropertyAccessExpression(node, stackFrame, maxDepth);
      case 'dereference_propertyaccess': return this.evalDereferencePropertyAccessExpression(node, stackFrame, maxDepth);
      case 'elementaccess': return this.evalElementAccessExpression(node, stackFrame, maxDepth);
      case 'call': return this.evalCallExpression(node, stackFrame, maxDepth);
      case 'unary': return this.evalUnaryExpression(node, stackFrame, maxDepth);
      case 'prefix_unary': return this.evalPrefixUnaryExpression(node, stackFrame, maxDepth);
      case 'postfix_unary': return this.evalPostfixUnaryExpression(node, stackFrame, maxDepth);
      case 'ternary': return this.evalTernaryExpression(node, stackFrame, maxDepth);
      default: break;
    }
    return '';
  }
  public async evalAssignmentExpression(node: AssignmentNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    if (typeof node.left === 'string') {
      return node.left;
    }
    if (!(node.left.type === 'identifier' || node.left.type === 'propertyaccess' || node.left.type === 'elementaccess' || node.left.type === 'binary')) {
      return this.evalNode(node.left);
    }

    let scope = '';
    let left: Node = node.left;
    if (left.type === 'binary') {
      if (left.operator === ' ' || left.operator === '\t') {
        scope = await this.nodeToString(left.left);
        left = left.right;
      }
    }

    const name = await this.nodeToString(left);
    const value = await this.evalNode(node.right, stackFrame, maxDepth);
    if (value instanceof dbgp.ObjectProperty) {
      return value;
    }
    else if (!(typeof value === 'string' || typeof value === 'number')) {
      return value;
    }

    if (scope === '') {
      await simulateSetProperty(this.session, stackFrame, name, value);
      return value;
    }

    const contexts = await getContexts(this.session, stackFrame);
    const context = contexts?.find((context) => equalsIgnoreCase(context.name, scope));
    if (!context) {
      return value;
    }
    await setProperty(this.session, context, name, value);
    return value;
  }
  public async evalUnaryExpression(node: UnaryNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    if (node.operator === '*') {
      throw Error('The `*` operator such as `*Expression` are not supported.');
    }

    if (node.operator === '&') {
      if (typeof node.expression !== 'string' && node.expression.type === 'identifier') {
        const name = await this.nodeToString(node.expression);
        const address = await fetchPropertyAddress(this.session, name, stackFrame, maxDepth);
        if (address) {
          return address;
        }
        throw Error('Retrieving the address of a variable with a primitive value is not supported.');
      }
      const expressionResult = this.evalNode(node.expression, stackFrame, maxDepth);
      if (expressionResult instanceof dbgp.ObjectProperty) {
        return expressionResult.address;
      }
      throw Error('Retrieving the address of a variable with a primitive value is not supported.');
    }

    const expressionResult = await this.evalNode(node.expression, stackFrame, maxDepth);

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
  public async evalPrefixUnaryExpression(node: PrefixUnaryNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    if (typeof node.expression === 'string') {
      return '';
    }

    let fullName = '';
    if (node.expression.type === 'identifier') {
      fullName = await this.nodeToString(node.expression);
      if (!fullName) {
        return '';
      }
    }
    else {
      const property = await this.evalNode(node.expression, stackFrame, maxDepth);
      if (!(property instanceof dbgp.ObjectProperty)) {
        return '';
      }
      fullName = property.fullName;
    }

    const value = await fetchProperty(this.session, fullName, stackFrame, maxDepth);
    if (typeof value !== 'number') {
      return '';
    }

    await simulateSetProperty(this.session, stackFrame, fullName, node.operator === '++' ? value + 1 : value - 1);

    const result = await fetchProperty(this.session, fullName, stackFrame, maxDepth);
    return result;
  }
  public async evalPostfixUnaryExpression(node: PostfixUnaryNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    if (typeof node.expression === 'string') {
      return '';
    }

    let fullName = '';
    if (node.expression.type === 'identifier') {
      fullName = await this.nodeToString(node.expression);
      if (!fullName) {
        return '';
      }
    }
    else {
      const property = await this.evalNode(node.expression);
      if (!(property instanceof dbgp.ObjectProperty)) {
        return '';
      }
      fullName = property.fullName;
    }

    const result = await fetchProperty(this.session, fullName, stackFrame, maxDepth);
    if (typeof result !== 'number') {
      return '';
    }

    await simulateSetProperty(this.session, stackFrame, fullName, node.operator === '++' ? result + 1 : result - 1);
    return result;
  }
  public async evalTernaryExpression(node: TernaryNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const conditionResult = await this.evalNode(node.condition, stackFrame, maxDepth);
    if ((conditionResult === '0' || !conditionResult)) {
      const result = await this.evalNode(node.whenFalse, stackFrame, maxDepth);
      return result;
    }
    const result = await this.evalNode(node.whenTrue, stackFrame, maxDepth);
    return result;
  }
  public async evalBinaryExpression(node: BinaryNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const left = await this.evalNode(node.left, stackFrame, maxDepth);
    const operator = node.operator;
    const right = await this.evalNode(node.right, stackFrame, maxDepth);

    switch (operator) {
      case ',': {
        if (!(typeof node.right === 'object' && node.right.type === 'identifier')) {
          return left;
        }

        const specifier = await this.nodeToString(node.right);
        switch (specifier) {
          case 'b': {
            const toBinary = this.library.get('toBinary')!;
            return toBinary(this.session, stackFrame, left);
          }
          case 'd': {
            const toDecimal = this.library.get('ToDecimal')!;
            return toDecimal(this.session, stackFrame, left);
          }
          case 'o': {
            const toOctal = this.library.get('ToOctal')!;
            return toOctal(this.session, stackFrame, left);
          }
          case 'x':
          case 'h': {
            const toHex = this.library.get('ToHex')!;
            return toHex(this.session, stackFrame, left);
          }
          case 'X':
          case 'H': {
            const toHex = this.library.get('ToHex')!;
            return toHex(this.session, stackFrame, left, 1);
          }
          case 'xb':
          case 'hb': {
            const toHex = this.library.get('ToHex')!;
            const result = await toHex(this.session, stackFrame, left);
            if (result === '') {
              return '';
            }
            return String(result).slice(2);
          }
          case 'Xb':
          case 'Hb': {
            const toHex = this.library.get('ToHex')!;
            const result = await toHex(this.session, stackFrame, left, 1);
            if (result === '') {
              return '';
            }
            return String(result).slice(2);
          }
          default: break;
        }
        return '';
      }
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
      case '<<':
      case '>>':
      case '>>>':
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
          // eslint-disable-next-line no-bitwise
          case '<<': return _left << _right;
          // eslint-disable-next-line no-bitwise
          case '>>': return _left >> _right;
          // eslint-disable-next-line no-bitwise
          case '>>>': return _left >>> _right;
          case '+': return _left + _right;
          case '-': return _left - _right;
          case '*': return _left * _right;
          case '**': return _left ** _right;
          case '/': {
            const result = _left / _right;
            return isFinite(result) ? result : '';
          }
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
      case '//':
      case '//=': throw Error(`The ${operator} operator is not supported.`);
      case '+=':
      case '-=':
      case '*=':
      case '/=':
      case '.=':
      case '|=':
      case '^=':
      case '&=':
      case '<<=':
      case '>>=':
      case '>>>=': {
        const binaryNode: BinaryNode = {
          type: 'binary',
          left: node.left,
          operator: operator.replace(/[=]$/u, ''),
          right: node.right,
        };
        const assignmentNode: AssignmentNode = {
          type: 'assign',
          left: node.left,
          operator: ':=',
          right: binaryNode,
        };
        return this.evalAssignmentExpression(assignmentNode, stackFrame, maxDepth);
      }
      default: break;
    }
    return '';
  }
  public async evalIdentifier(node: IdentifierNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const name = await this.nodeToString(node);
    if (!name) {
      return '';
    }

    const result = await fetchProperty(this.session, name, stackFrame, maxDepth);
    return result;
  }
  public async evalDeferenceExpressions(node: DereferenceExpressionsNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    let variableName = '';
    for await (const childNode of node.dereferenceExpressions) {
      if (childNode.type === 'identifier') {
        variableName += await this.nodeToString(childNode);
        continue;
      }

      const evaluated = await this.evalDeferenceExpression(childNode, stackFrame, maxDepth);
      if (evaluated instanceof dbgp.ObjectProperty) {
        continue;
      }
      variableName += evaluated;
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
    if (object instanceof dbgp.ObjectProperty) {
      const propertyName = await this.nodeToString(node.property);
      if (!propertyName) {
        return '';
      }

      const child = await fetchInheritedProperty(this.session, stackFrame, object, propertyName);
      return child;
    }
    else if (object instanceof MetaVariable) {
      if (!object.hasChildren) {
        return '';
      }

      await object.loadChildren(1);
      const name = await this.nodeToString(node.property);
      const child = object.children?.find((child) => equalsIgnoreCase(child.name, name) || equalsIgnoreCase(child.name, `[${name}]`));
      if (child instanceof MetaVariable) {
        if (typeof child.rawValue === 'string' || typeof child.rawValue === 'number') {
          return child.rawValue;
        }
        return child;
      }
      else if (child) {
        return new MetaVariable(name, child);
      }
      return '';
    }
    return '';
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
    if (object instanceof dbgp.ObjectProperty) {
      const evaluatedArguments = (await Promise.all(node.arguments.map(async(arg) => this.evalNode(arg, stackFrame, maxDepth))));

      let current: dbgp.ObjectProperty = object;
      for await (const arg of evaluatedArguments.slice(0, -1)) {
        const child = await fetchPropertyChild(this.session, stackFrame, current, arg);
        if (child instanceof dbgp.ObjectProperty) {
          current = child;
          continue;
        }
        break;
      }

      const property = await fetchPropertyChild(this.session, stackFrame, current, evaluatedArguments[evaluatedArguments.length - 1]);
      return property;
    }
    else if (object instanceof MetaVariable) {
      const evaluatedArguments = (await Promise.all(node.arguments.map(async(arg) => this.evalNode(arg, stackFrame, maxDepth))));
      let current = object;
      for await (const arg of evaluatedArguments) {
        if (!current.hasChildren) {
          return '';
        }
        if (!(typeof arg === 'string' || typeof arg === 'number')) {
          return '';
        }

        await current.loadChildren(1);
        const child = current.children?.find((child) => equalsIgnoreCase(child.name, String(arg)) || equalsIgnoreCase(child.name, `[${String(arg)}]`));
        if (!(child instanceof MetaVariable)) {
          return '';
        }

        current = child;
      }
      return current;
    }

    return '';
  }
  public async evalCallExpression(node: CallNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const libraryName = await this.nodeToString(node.caller);
    if (!libraryName) {
      return '';
    }

    const library = this.library.get(libraryName);
    if (equalsIgnoreCase(libraryName, 'GetMeta') && 0 < node.arguments.length) {
      const metaVariableName = await this.nodeToString(node.arguments[0]);
      const metaVariableValue = this.metaVariableMap.get(metaVariableName);
      const value = metaVariableValue instanceof Promise
        ? await metaVariableValue
        : metaVariableValue;
      if (typeof value === 'undefined') {
        return undefined;
      }
      if (typeof value === 'string' || typeof value === 'number') {
        return value;
      }
      return new MetaVariable(metaVariableName, value);
    }
    if (equalsIgnoreCase(libraryName, 'GetVar') && 0 < node.arguments.length) {
      const contexts = await getContexts(this.session, stackFrame);
      if (!contexts) {
        return '';
      }

      const name = await this.evalNode(node.arguments[0]);
      const maxDepth = 2 <= node.arguments.length
        ? Number(node.arguments[1])
        : 1;
      if (typeof name !== 'string') {
        return '';
      }
      if (Number.isNaN(maxDepth)) {
        return '';
      }

      for await (const context of contexts) {
        const response = await this.session.sendPropertyGetCommand(context, name, maxDepth);
        if (response.properties.length === 0) {
          continue;
        }

        const property = response.properties[0];
        if (property.type === 'undefined') {
          continue;
        }

        if (property instanceof dbgp.PrimitiveProperty) {
          return property.value;
        }
        if (property instanceof dbgp.ObjectProperty) {
          return property;
        }
      }

      return undefined;
    }
    else if (library) {
      const args = await Promise.all(node.arguments.map(async(arg) => this.evalNode(arg)));
      return library(this.session, stackFrame, ...args);
    }
    return '';
  }
  public async nodeToString(node: Node): Promise<string> {
    if (typeof node === 'string') {
      if (node.startsWith('"') && node.endsWith('"')) {
        return unescapeAhk(node.slice(1, -1), this.session.ahkVersion);
      }
      if (node.startsWith(`'`) && node.endsWith(`'`)) {
        return unescapeAhk(singleToDoubleString(node.slice(1, -1)), this.session.ahkVersion);
      }
      return node;
    }

    switch (node.type) {
      case 'identifier':
        return `${node.start}${node.parts.join('')}`;
      case 'propertyaccess': {
        const object = await this.nodeToString(node.object);
        const property = await this.nodeToString(node.property);
        return `${object}.${property}`;
      }
      case 'elementaccess': {
        const object = await this.nodeToString(node.object);
        const args = await Promise.all(node.arguments.map(async(arg) => {
          const evaluated = await this.evalNode(arg);
          if (evaluated instanceof dbgp.ObjectProperty) {
            return `[${evaluated.address}]`;
          }
          if (typeof evaluated === 'number') {
            return `[${evaluated}]`;
          }
          if (typeof evaluated === 'string') {
            return `["${evaluated}"]`;
          }
          return '[""]';
        }));
        return `${object}${args.join('')}`;
      }
      default: break;
    }
    return '';
  }
}
