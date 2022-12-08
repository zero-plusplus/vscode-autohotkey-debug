/* eslint-disable no-eval */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as ohm from 'ohm-js';
import { toAST } from 'ohm-js/extras';
import { LibraryFunc, library_for_v1, library_for_v2 } from './library';
import * as dbgp from '../../dbgpSession';
import { CaseInsensitiveMap } from '../CaseInsensitiveMap';
import { equalsIgnoreCase } from '../stringUtils';
import { ExpressionParser } from './ExpressionParser';

export type Node =
 | IdentifierNode
 | BinaryNode
 | PropertyAccessNode
 | ElementAccessNode
 | CallNode
 | StringNode
 | NumberNode
 | string;
export type BinaryNode =
 | AdditionNode
 | SubtractionNode
 | MultiplicationNode
 | DivisionNode;

export interface NodeBase {
  type: string;
}
export interface BinaryNodeBase extends NodeBase {
  left: Node;
  operator: Node;
  right: Node;
}
export interface AdditionNode extends BinaryNodeBase {
  type: 'addition';
}
export interface SubtractionNode extends BinaryNodeBase {
  type: 'subtraction';
}
export interface MultiplicationNode extends BinaryNodeBase {
  type: 'multiplication';
}
export interface DivisionNode extends BinaryNodeBase {
  type: 'division';
}
export interface IdentifierNode extends NodeBase {
  type: 'identifier';
  start: string;
  parts: string[];
}
export interface PropertyAccessNode extends NodeBase {
  type: 'propertyaccess';
  object: Node;
  property: Node;
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
export type EvaluatedValue = string | number | boolean | undefined | dbgp.ObjectProperty;
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
export const fetchProperty = async(session: dbgp.Session, name: string, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> => {
  if (!name) {
    return undefined;
  }

  let _stackFrame = stackFrame;
  if (!_stackFrame) {
    const { stackFrames } = await session.sendStackGetCommand();
    if (stackFrames.length === 0) {
      return undefined;
    }
    _stackFrame = stackFrames[0];
  }

  const { contexts } = await session.sendContextNamesCommand(_stackFrame);
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
  return undefined;
};
export class ExpressionEvaluator {
  private readonly session: dbgp.Session;
  private readonly parser: ExpressionParser;
  private readonly library: CaseInsensitiveMap<string, LibraryFunc>;
  constructor(session: dbgp.Session) {
    this.session = session;
    this.library = 2.0 < session.ahkVersion.mejor
      ? library_for_v2
      : library_for_v1;
    this.parser = new ExpressionParser();
  }
  public async eval(expression: string, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const matchResult = this.parser.parse(expression);
    const node = toAST(matchResult, {
      AdditiveExpression_addition: { type: 'addition', left: 0, operator: 1, right: 2 },
      AdditiveExpression_subtraction: { type: 'subtraction', left: 0, operator: 1, right: 2 },
      MultiplicativeExpression_multiplication: { type: 'multiplication', left: 0, operator: 1, right: 2 },
      MultiplicativeExpression_division: { type: 'division', left: 0, operator: 1, right: 2 },
      MemberExpression_propertyaccess: { type: 'propertyaccess', object: 0, property: 2 },
      MemberExpression_elementaccess: { type: 'elementaccess', object: 0, arguments: 2 },
      CallExpression: { type: 'call', caller: 0, arguments: 2 },
      identifier: { type: 'identifier', start: 0, parts: 1 },
      stringLiteral: { type: 'string', startQuote: 0, value: 0, endQuote: 0 },
      numericLiteral: { type: 'number', value: 0 },
    }) as Node;

    const result = await this.evalNode(node, stackFrame, maxDepth);
    return result;
  }
  public async evalNode(node: Node, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    if (typeof node === 'string') {
      if (node.startsWith('"') && node.endsWith('"')) {
        return node.slice(1, -1);
      }
      return Number(node);
    }

    switch (node.type) {
      case 'addition':
      case 'subtraction':
      case 'multiplication':
      case 'division':
        return this.evalBinaryExpression(node, stackFrame, maxDepth);
      case 'identifier': return this.evalIdentifier(node, stackFrame, maxDepth);
      case 'propertyaccess': return this.evalPropertyAccessExpression(node, stackFrame, maxDepth);
      case 'elementaccess': return this.evalElementAccessExpression(node, stackFrame, maxDepth);
      case 'call': return this.evalCallExpression(node, stackFrame, maxDepth);
      default: break;
    }
    return undefined;
  }
  public async evalBinaryExpression(node: BinaryNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const left = await this.evalNode(node.left, stackFrame, maxDepth);
    const operator = node.operator;
    const right = await this.evalNode(node.right, stackFrame, maxDepth);

    switch (operator) {
      case '+': return Number(left) + Number(right);
      case '-': return Number(left) - Number(right);
      case '*': return Number(left) * Number(right);
      case '/': return Number(left) / Number(right);
      default: break;
    }
    return undefined;
  }
  public async evalIdentifier(node: IdentifierNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const name = this.nodeToString(node);
    if (!name) {
      return undefined;
    }

    const result = await fetchProperty(this.session, name, stackFrame, maxDepth);
    return result;
  }
  public async evalPropertyAccessExpression(node: PropertyAccessNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const object = await this.evalNode(node.object, stackFrame, maxDepth);
    if (!(object instanceof dbgp.ObjectProperty)) {
      return undefined;
    }
    const propertyName = this.nodeToString(node.property);
    if (!propertyName) {
      return undefined;
    }

    const child = await fetchPropertyChild(this.session, stackFrame, object, propertyName);
    return child;
  }
  public async evalElementAccessExpression(node: ElementAccessNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const object = await this.evalNode(node.object, stackFrame, maxDepth);
    if (!(object instanceof dbgp.ObjectProperty)) {
      return undefined;
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
      return undefined;
    }
    const args = await Promise.all(node.arguments.map(async(arg) => this.evalNode(arg)));
    const result = await this.library.get(libraryName)?.(this.session, stackFrame, ...args);
    return result;
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
    return undefined;
  }
}
