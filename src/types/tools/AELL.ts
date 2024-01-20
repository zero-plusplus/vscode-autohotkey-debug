export const enum SyntaxKind {
  StringLiteral,
  NumberLiteral,
  Identifier,
  DereferenceExpressions,
  DereferenceExpression,
  PropertyAccessExpression,
  DereferencePropertyAccessExpression,
  ElementAccessExpression,
  CallExpression,
  UnaryExpression,
  PrefixUnaryExpression,
  PostFixUnaryExpression,
  TernaryExpression,
  AssignExpression,
  BinaryExpression,
}
export type Node =
 | IdentifierNode
 | AssignmentExpressionNode
 | BinaryExpressionNode
 | UnaryExpressionNode
 | PrefixUnaryExpressionNode
 | PostfixUnaryExpressionNode
 | TernaryExpressionNode
 | DereferenceExpressionsNode
 | DereferenceExpressionNode
 | PropertyAccessExpressionNode
 | DereferencePropertyAccessExpressionNode
 | ElementAccessExpressionNode
 | CallExpressionNode
 | StringLiteralNode
 | NumberLiteralNode;

export interface NodeBase {
  kind: SyntaxKind;
}
export interface Binary {
  left: Node;
  operator: string;
  right: Node;
}
export interface UnaryExpressionNode extends NodeBase {
  kind: SyntaxKind.UnaryExpression;
  operator: '+' | '-' | '&' | '!' | '~' | '*';
  expression: Node;
}
export interface PrefixUnaryExpressionNode extends NodeBase {
  kind: SyntaxKind.PrefixUnaryExpression;
  operator: '++' | '--';
  expression: Node;
}
export interface PostfixUnaryExpressionNode extends NodeBase {
  kind: SyntaxKind.PostFixUnaryExpression;
  expression: Node;
  operator: '++' | '--';
}
export interface TernaryExpressionNode extends NodeBase {
  kind: SyntaxKind.TernaryExpression;
  condition: Node;
  whenTrue: Node;
  whenFalse: Node;
}
export interface AssignmentExpressionNode extends NodeBase, Binary {
  kind: SyntaxKind.AssignExpression;
  operator: ':=';
}
export interface BinaryExpressionNode extends NodeBase, Binary {
  kind: SyntaxKind.BinaryExpression;
}
export interface IdentifierNode extends NodeBase {
  kind: SyntaxKind.Identifier;
  start: string;
  parts: string[];
}

export interface DereferenceExpressionsNode extends NodeBase {
  kind: SyntaxKind.DereferenceExpressions;
  dereferenceExpressions: Array<IdentifierNode | DereferenceExpressionNode>;
}
export interface DereferenceExpressionNode extends NodeBase {
  kind: SyntaxKind.DereferenceExpression;
  leftPercent: '%';
  expression: Node;
  rightPercent: '%';
}

export interface PropertyAccessExpressionNode extends NodeBase {
  kind: SyntaxKind.PropertyAccessExpression;
  object: Node;
  property: Node;
}
export interface DereferencePropertyAccessExpressionNode extends NodeBase {
  kind: SyntaxKind.DereferencePropertyAccessExpression;
  object: Node;
  property: DereferenceExpressionsNode;
}
export interface ElementAccessExpressionNode extends NodeBase {
  kind: SyntaxKind.ElementAccessExpression;
  object: Node;
  arguments: Node[];
}
export interface CallExpressionNode extends NodeBase {
  kind: SyntaxKind.CallExpression;
  caller: Node;
  arguments: Node[];
}
export interface StringLiteralNode extends NodeBase {
  kind: SyntaxKind.StringLiteral;
  startQuote: string;
  endQuote: string;
  value: string;
}
export interface NumberLiteralNode extends NodeBase {
  kind: SyntaxKind.NumberLiteral;
  value: number;
}
export type Function = (...params: any[]) => string | number | undefined;
export type Library = {
  [key: string]: (...params: any[]) => string | number | undefined;
};

export type EvaluatedValue<Data> = VariableAdapter<Data>;
export type EvalNodeFunction<Data> = (node: Node) => Promise<EvaluatedValue<Data>>;
export type OverrideFunction<Data, N extends Node = Node> = (node: N, evalNode: EvalNodeFunction<Data>) => Promise<EvaluatedValue<Data>>;
export type EvalOverrides = {
  [SyntaxKind.StringLiteral]?: OverrideFunction<StringLiteralNode>;
  [SyntaxKind.NumberLiteral]?: OverrideFunction<NumberLiteralNode>;
  [SyntaxKind.Identifier]?: OverrideFunction<IdentifierNode>;
  [SyntaxKind.DereferenceExpressions]?: OverrideFunction<DereferenceExpressionsNode>;
  [SyntaxKind.DereferenceExpression]?: OverrideFunction<DereferenceExpressionNode>;
  [SyntaxKind.PropertyAccessExpression]?: OverrideFunction<PropertyAccessExpressionNode>;
  [SyntaxKind.DereferencePropertyAccessExpression]?: OverrideFunction<DereferencePropertyAccessExpressionNode>;
  [SyntaxKind.ElementAccessExpression]?: OverrideFunction<ElementAccessExpressionNode>;
  [SyntaxKind.CallExpression]?: OverrideFunction<CallExpressionNode>;
  [SyntaxKind.UnaryExpression]?: OverrideFunction<UnaryExpressionNode>;
  [SyntaxKind.PrefixUnaryExpression]?: OverrideFunction<PrefixUnaryExpressionNode>;
  [SyntaxKind.PostFixUnaryExpression]?: OverrideFunction<PostfixUnaryExpressionNode>;
  [SyntaxKind.TernaryExpression]?: OverrideFunction<TernaryExpressionNode>;
  [SyntaxKind.AssignExpression]?: OverrideFunction<AssignmentExpressionNode>;
  [SyntaxKind.BinaryExpression]?: OverrideFunction<BinaryExpressionNode>;
};

/**
 * @example
*  //   | demo.ahk
*  //   |=================
*  //  1| bar := "Global"
*  //  2| foo()
*  //  3| foo() {
*  //  4|  bar := "Local"
*  //  5|  baz := { a: "value_a", b: { c: "value_c" } }
*  //=>6| }
*  const adapter = createVariableAdapter(dbgp.session);
*
*  // Must be defined to retrieve contextual variables like real AutoHotkey scripts
*  const bar = adapter.get(bar);
*  // Accessing a variable by its name, such as `"var:value"`, allows access to the meta-information of that variable. Omit `var` when used for the current variable
*  console.log(bar.getMeta('value')) // => "Local";
*
*  const baz = adapter.get('baz');
*  console.log(baz.get('a').getMeta('value')) // => "value_a"
*  console.log(baz.get('b'))       // => baz.b
*  console.log(baz.get('b', 'c').getMeta('value'))  // => "value_c"
*/
export interface VariableAdapter<Data> {
  parent: VariableAdapter<Data>;
  set: (name: string, value: Data) => Promise<VariableAdapter<Data>>;
  get: (...names: string[]) => Promise<VariableAdapter<Data>>;
  getMeta: <K extends keyof Data = keyof Data>(name: K) => Promise<Data[K]>;
  invoke: (name: string, ...params: Array<VariableAdapter<Data>>) => Promise<VariableAdapter<Data>>;
}
