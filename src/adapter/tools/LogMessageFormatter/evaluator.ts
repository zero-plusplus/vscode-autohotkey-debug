/* eslint-disable func-style, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-use-before-define */
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import { parse } from './parser';
import * as AELL from '../AELL';
import { EvalOverrides, EvaluatedValue, Node, SyntaxKind } from '../../../types';

export const createEvaluator = (ahkVersionOrText: string | AhkVersion, overrides: EvalOverrides) => {
  const ahkVersion = ahkVersionOrText instanceof AhkVersion ? ahkVersionOrText : new AhkVersion(ahkVersionOrText);
  AELL.create()

  return {
    async eval(expression: string): Promise<EvaluatedValue> {
      const node = parse(ahkVersion, expression);
      return evalNode(node);
    },
  };

  async function evalNode(node: Node): Promise<EvaluatedValue> {
    switch (node.kind) {
      case SyntaxKind.StringLiteral: return overrides[node.kind]?.(node, evalNode) ?? undefined;
      case SyntaxKind.AssignExpression: return overrides[node.kind]?.(node, evalNode) ?? undefined;
      case SyntaxKind.BinaryExpression: return overrides[node.kind]?.(node, evalNode) ?? undefined;
      case SyntaxKind.Identifier: return overrides[node.kind]?.(node, evalNode) ?? undefined;
      case SyntaxKind.DereferenceExpressions: return overrides[node.kind]?.(node, evalNode) ?? undefined;
      case SyntaxKind.DereferenceExpression: return overrides[node.kind]?.(node, evalNode) ?? undefined;
      case SyntaxKind.PropertyAccessExpression: return overrides[node.kind]?.(node, evalNode) ?? undefined;
      case SyntaxKind.DereferencePropertyAccessExpression: return overrides[node.kind]?.(node, evalNode) ?? undefined;
      case SyntaxKind.ElementAccessExpression: return overrides[node.kind]?.(node, evalNode) ?? undefined;
      case SyntaxKind.CallExpression: return overrides[node.kind]?.(node, evalNode) ?? undefined;
      case SyntaxKind.UnaryExpression: return overrides[node.kind]?.(node, evalNode) ?? undefined;
      case SyntaxKind.PrefixUnaryExpression: return overrides[node.kind]?.(node, evalNode) ?? undefined;
      case SyntaxKind.PostFixUnaryExpression: return overrides[node.kind]?.(node, evalNode) ?? undefined;
      case SyntaxKind.TernaryExpression: return overrides[node.kind]?.(node, evalNode) ?? undefined;
      default: break;
    }
    return undefined;
  }
};
