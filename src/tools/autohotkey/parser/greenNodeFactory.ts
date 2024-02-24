import { GreenElement, GreenNode, GreenToken, SyntaxKind } from '../../../types/tools/autohotkey/parser/common.types';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createGreenNodeFactory = () => {
  const tokenCache = new Map<string, GreenToken>();

  return {
    createToken: (kind: SyntaxKind, text: string): Readonly<GreenToken> => {
      const cacheKey = `${kind}:${text}`;
      const cache = tokenCache.get(cacheKey);
      if (cache) {
        return cache;
      }

      const greenToken: GreenToken = { kind, text };
      tokenCache.set(cacheKey, greenToken);
      return greenToken;
    },
    createNode: (kind: SyntaxKind, children: GreenElement[] = []): Readonly<GreenNode> => {
      const greenNode: GreenNode = {
        kind,
        width: children.reduce((width, element) => {
          return 'children' in element
            ? width + element.width
            : width + element.text.length;
        }, 0),
        children,
      };
      return greenNode;
    },
  };
};
