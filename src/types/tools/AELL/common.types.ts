export const enum SyntaxKind {
  StringLiteral = 'StringLiteral',
  NumberLiteral = 'NumberLiteral',
  Identifier = 'Identifier',
  DereferenceExpressions = 'DereferenceExpressions',
  DereferenceExpression = 'DereferenceExpression',
  PropertyAccessExpression = 'PropertyAccessExpression',
  DereferencePropertyAccessExpression = 'DereferencePropertyAccessExpression',
  ElementAccessExpression = 'ElementAccessExpression',
  CallExpression = 'CallExpression',
  UnaryExpression = 'UnaryExpression',
  PreFixUnaryExpression = 'PrefixUnaryExpression',
  PostFixUnaryExpression = 'PostFixUnaryExpression',
  TernaryExpression = 'TernaryExpression',
  AssignExpression = 'AssignExpression',
  BinaryExpression = 'BinaryExpression',
}

// #region node
export type Node =
  | IdentifierNode
  | StringLiteralNode
  | NumberLiteralNode
  | UnaryExpressionNode
  | DereferenceExpressionsNode
  | DereferenceExpressionNode
  | PropertyAccessExpressionNode
  | DereferencePropertyAccessExpressionNode
  | ElementAccessExpressionNode
  | CallExpressionNode
  | PrefixUnaryExpressionNode
  | PostfixUnaryExpressionNode
  | BinaryExpressionNode
  | AssignmentExpressionNode
  | TernaryExpressionNode;

export interface Syntax {
  kind: SyntaxKind;
}
export interface UnaryExpressionNode extends Syntax {
  kind: SyntaxKind.UnaryExpression;
  operator: '+' | '-' | '&' | '!' | '~' | '*';
  operand: Node;
}
export interface PrefixUnaryExpressionNode extends Syntax {
  kind: SyntaxKind.PreFixUnaryExpression;
  operator: '++' | '--';
  operand: Node;
}
export interface PostfixUnaryExpressionNode extends Syntax {
  kind: SyntaxKind.PostFixUnaryExpression;
  operand: Node;
  operator: '++' | '--';
}
export interface TernaryExpressionNode extends Syntax {
  kind: SyntaxKind.TernaryExpression;
  condition: Node;
  whenTrue: Node;
  whenFalse: Node;
}
export interface AssignmentExpressionNode extends Syntax {
  kind: SyntaxKind.AssignExpression;
  left: Node;
  operator: ':=';
  right: Node;
}
export interface BinaryExpressionNode extends Syntax {
  kind: SyntaxKind.BinaryExpression;
  left: Node;
  operator: string;
  right: Node;
}
export interface IdentifierNode extends Syntax {
  kind: SyntaxKind.Identifier;
  value: string;
}

export interface DereferenceExpressionsNode extends Syntax {
  kind: SyntaxKind.DereferenceExpressions;
  dereferenceExpressions: Array<IdentifierNode | DereferenceExpressionNode>;
}
export interface DereferenceExpressionNode extends Syntax {
  kind: SyntaxKind.DereferenceExpression;
  leftPercent: '%';
  expression: Node;
  rightPercent: '%';
}

export interface PropertyAccessExpressionNode extends Syntax {
  kind: SyntaxKind.PropertyAccessExpression;
  object: Node;
  property: Node;
}
export interface DereferencePropertyAccessExpressionNode extends Syntax {
  kind: SyntaxKind.DereferencePropertyAccessExpression;
  object: Node;
  property: DereferenceExpressionsNode;
}
export interface ElementAccessExpressionNode extends Syntax {
  kind: SyntaxKind.ElementAccessExpression;
  object: Node;
  arguments: Node[];
}
export interface CallExpressionNode extends Syntax {
  kind: SyntaxKind.CallExpression;
  caller: Node;
  arguments: Node[];
}
export interface StringLiteralNode extends Syntax {
  kind: SyntaxKind.StringLiteral;
  value: string;
  text: string;
}
export interface NumberLiteralNode extends Syntax {
  kind: SyntaxKind.NumberLiteral;
  value: string;
}
// #endregion node
