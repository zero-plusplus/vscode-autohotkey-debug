import { NodeTransformer } from '../../../types/tools/AELL/transformer/common.types';
import { BooleanLiteral, CustomNode, ElementAccessExpression, Expression, Identifier, NumberLiteral, PropertyAccessExpression, StringLiteral, SyntaxKind } from '../../../types/tools/autohotkey/parser/common.types';
import { ParsedAutoHotkeyVersion } from '../../../types/tools/autohotkey/version/common.types';
import { isQueryNode } from '../utils';

export const createQueryTransformer = (version: ParsedAutoHotkeyVersion): NodeTransformer => {
  return {
    transform: (node: Expression): Expression => {
      return transformNode(node);

      function transformNode(node: Expression): Expression {
        switch (node.kind) {
          case SyntaxKind.Identifier: return transformIdentifer(node);
          case SyntaxKind.PropertyAccessExpression: return transformPropertyAccessExpression(node);
          case SyntaxKind.ElementAccessExpression: return transformElementAccessExpression(node);
          case SyntaxKind.StringLiteral:
          case SyntaxKind.NumberLiteral:
          case SyntaxKind.BooleanLiteral:
            return node;
          case SyntaxKind.BinaryExpression:
          case SyntaxKind.Custom:
            return node;
          default: break;
        }
        return node;
      }
      function transformIdentifer(node: Identifier): CustomNode {
        return { kind: SyntaxKind.Custom, query: node.text, startPosition: node.startPosition, endPosition: node.endPosition };
      }
      function transformPrimitiveLiteral(node: StringLiteral | NumberLiteral | BooleanLiteral): CustomNode {
        return { kind: SyntaxKind.Custom, query: node.text, startPosition: node.startPosition, endPosition: node.endPosition };
      }
      function transformPropertyAccessExpression(node: PropertyAccessExpression): PropertyAccessExpression | CustomNode {
        const object = transformNode(node.object);
        const property = transformNode(node.property);


        if (isQueryNode(object) && isQueryNode(property)) {
          const name = property.query;
          return { kind: SyntaxKind.Custom, query: node.text, name, startPosition: node.startPosition, endPosition: node.endPosition };
        }
        return {
          kind: SyntaxKind.PropertyAccessExpression,
          object,
          property: property as typeof node.property,
          startPosition: node.startPosition,
          endPosition: node.endPosition,
          text: node.text,
        };
      }
      function transformElementAccessExpression(node: ElementAccessExpression): ElementAccessExpression | CustomNode {
        const object = transformNode(node.object);
        const elements = node.elements.map((element): Expression | ({ query: string } & CustomNode) => {
          switch (element.kind) {
            case SyntaxKind.Identifier: return transformIdentifer(element);
            case SyntaxKind.PropertyAccessExpression: return transformPropertyAccessExpression(element);
            case SyntaxKind.ElementAccessExpression: return transformElementAccessExpression(element);
            case SyntaxKind.StringLiteral:
            case SyntaxKind.NumberLiteral:
            case SyntaxKind.BooleanLiteral:
              return transformPrimitiveLiteral(element);
            default: break;
          }
          return node;
        });

        const isAllPrimitive = node.elements.every((element) => element.kind === SyntaxKind.StringLiteral || element.kind === SyntaxKind.NumberLiteral);
        if (isAllPrimitive && isQueryNode(object)) {
          const primitiveElements = elements as Array<CustomNode & { query: string }>;
          const name = `[${primitiveElements.map((element) => element.query).join(',')}]`;
          return {
            kind: SyntaxKind.Custom,
            query: `${object.query}[${primitiveElements.map((element) => element.query).join(',')}]`,
            name,
            startPosition: node.startPosition,
            endPosition: node.endPosition,
          };
        }

        return {
          kind: SyntaxKind.ElementAccessExpression,
          object,
          elements,
          endPosition: node.startPosition,
          startPosition: node.endPosition,
          text: node.text,
        };
      }
    },
  };
};
