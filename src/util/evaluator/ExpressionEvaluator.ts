/* eslint-disable no-eval */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as ohm from 'ohm-js';
import { toAST } from 'ohm-js/extras';
import * as dbgp from '../../dbgpSession';
import { ExpressionParser } from './ExpressionParser';

export type Node =
 | IdentifierNode
 | BinaryNode
 | PropertyAccessNode
 | ElementAccessNode
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
export class ExpressionEvaluator {
  private readonly session: dbgp.Session;
  private readonly parser: ExpressionParser;
  constructor(session: dbgp.Session) {
    this.session = session;
    this.parser = new ExpressionParser(session.ahkVersion);
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
      identifier: { type: 'identifier', start: 0, parts: 1 },
      stringLiteral: { type: 'string', startQuote: 0, value: 0, endQuote: 0 },
      numericLiteral: { type: 'number', value: 0 },
    }) as Node;

    const result = await this.evalNode(node, stackFrame, maxDepth);
    return result;
  }
  public async evalNode(node: Node, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    if (typeof node === 'string') {
      return node;
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
  public async evalVariableByName(name: string | undefined, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    if (!name) {
      return undefined;
    }

    let _stackFrame = stackFrame;
    if (!_stackFrame) {
      const stackFrames = (await this.session.sendStackGetCommand()).stackFrames;
      if (stackFrames.length === 0) {
        return undefined;
      }
      _stackFrame = stackFrames[0];
    }

    const { contexts } = await this.session.sendContextNamesCommand(_stackFrame);
    for await (const context of contexts) {
      const response = await this.session.sendPropertyGetCommand(context, name, maxDepth);
      const property = response.properties[0] as dbgp.Property | undefined;
      if (property instanceof dbgp.ObjectProperty) {
        return property;
      }
      if (property instanceof dbgp.PrimitiveProperty) {
        if (property.type === 'string') {
          return property.value;
        }
        return Number(property.value);
      }
    }
    return undefined;
  }
  public async evalIdentifier(node: IdentifierNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const name = await this.nodeToString(node, stackFrame, maxDepth);
    return this.evalVariableByName(name, stackFrame, maxDepth);
  }
  public async evalPropertyAccessExpression(node: PropertyAccessNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const name = await this.nodeToString(node, stackFrame, maxDepth);
    return this.evalVariableByName(name, stackFrame, maxDepth);
  }
  public async evalElementAccessExpression(node: ElementAccessNode, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<EvaluatedValue> {
    const name = await this.nodeToString(node, stackFrame, maxDepth);
    return this.evalVariableByName(name, stackFrame, maxDepth);
  }
  public async nodeToString(node: Node, stackFrame?: dbgp.StackFrame, maxDepth = 1): Promise<string | undefined> {
    if (typeof node === 'string') {
      return node;
    }

    switch (node.type) {
      case 'propertyaccess': {
        const object = await this.nodeToString(node.object, stackFrame, maxDepth);
        const property = await this.nodeToString(node.property, stackFrame, maxDepth);
        return `${String(object)}.${String(property)}`;
      }
      case 'elementaccess': {
        const object = await this.nodeToString(node.object, stackFrame, maxDepth);
        const args = (await Promise.all(node.arguments.map(async(arg) => this.nodeToString(arg)))).join(', ');
        return `${String(object)}[${args}]`;
      }
      case 'identifier':
        return `${node.start}${node.parts.join('')}`;
      case 'string':
        return `${node.startQuote}${node.value}${node.endQuote}`;
      case 'number':
        return `${node.value}`;
      default: break;
    }
    return undefined;
  }
}
