import type * as AELL from './tools/AELL';

export const enum SyntaxKind {
  RawText,
  DirectiveExpression,
  EmbeddedExpression,
}

export type Node
  = AELL.Node;

export interface NodeBase {
  kind: SyntaxKind;
}
export interface DirectiveExpressionNode extends NodeBase {
  kind: SyntaxKind.DirectiveExpression;
  expression: AELL.Node;
}
export interface EmbeddedExpressionNode extends NodeBase {
  kind: SyntaxKind.EmbeddedExpression;
  expression: AELL.Node;
}
