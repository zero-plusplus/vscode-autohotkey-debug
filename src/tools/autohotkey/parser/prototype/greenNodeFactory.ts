import { GreenElement, GreenNode, GreenToken, SyntaxKind, TokenFlags } from '../../../../types/tools/autohotkey/parser/common.types';
import { memoize } from '../../../utils/memoize';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createGreenNodeFactory = memoize(() => {
  const tokenCache = new Map<string, GreenToken>();

  return {
    // #region token
    createToken,
    createUnknown: (): GreenToken => createToken(SyntaxKind.Unknown, ''),
    createBom: (): GreenToken => createToken(SyntaxKind.Bom, '\ufeff'),
    createEndOfFileToken: (): GreenToken => createToken(SyntaxKind.EndOfFileToken, ''),
    createSpaceTrivia: (count = 1): GreenToken => createToken(SyntaxKind.HorizSpaceTrivia, ' '.repeat(count)),
    createTabTrivia: (count = 1): GreenToken => createToken(SyntaxKind.HorizSpaceTrivia, '\t'.repeat(count)),
    createCrLnTrivia: (count = 1): GreenToken => createToken(SyntaxKind.NewLineTrivia, '\r\n'.repeat(count)),
    createLnTrivia: (count = 1): GreenToken => createToken(SyntaxKind.NewLineTrivia, '\n'.repeat(count)),
    createIdentifier: (text: string, flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.Identifier, text, flags),
    createStringLiteral: (text: string, flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.StringLiteral, text, flags),
    createNumberLiteral: (text: number | `${number}`, flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.NumberLiteral, String(text), flags),
    createPlusToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.PlusToken, '+', flags),
    createPlusPlusToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.PlusPlusToken, '++', flags),
    createPlusEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.PlusEqualsToken, '+=', flags),
    createMinusToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.MinusToken, '-', flags),
    createMinusMinusToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.MinusMinusToken, '--', flags),
    createMinusEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.MinusEqualsToken, '-=', flags),
    createAsteriskToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.AsteriskToken, '*', flags),
    createAsteriskAsteriskToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.AsteriskAsteriskToken, '**', flags),
    createAsteriskEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.AsteriskEqualsToken, '*=', flags),
    createSlashToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.SlashToken, '/', flags),
    createSlashSlashToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.SlashSlashToken, '//', flags),
    createSlashEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.SlashEqualsToken, '/=', flags),
    createSlashSlashEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.SlashSlashEqualsToken, '//=', flags),
    createColonToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.ColonToken, ':', flags),
    createColonEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.ColonEqualsToken, ':=', flags),
    createCommaToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.CommaToken, ',', flags),
    createEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.EqualsToken, '=', flags),
    createEqualsEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.EqualsEqualsToken, '==', flags),
    createEqualsGreaterThanToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.EqualsGreaterThanToken, '=>', flags),
    createDotToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.DotToken, '.', flags),
    createDotEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.DotEqualsToken, '.=', flags),
    createBarToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.BarToken, '|', flags),
    createBarBarToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.BarBarToken, '||', flags),
    createBarEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.BarEqualsToken, '|=', flags),
    createAmpersandToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.AmpersandToken, '&', flags),
    createAmpersandAmpersandToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.AmpersandAmpersandToken, '&&', flags),
    createAmpersandEqualToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.AmpersandEqualToken, '&=', flags),
    createCaretToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.CaretToken, '^', flags),
    createCaretEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.CaretEqualsToken, '^=', flags),
    createLessThanToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.LessThanToken, '<', flags),
    createLessThanEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.LessThanEqualsToken, '<=', flags),
    createLessThanLessThanToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.LessThanLessThanToken, '<<', flags),
    createLessThanLessThanEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.LessThanLessThanEqualsToken, '<<=', flags),
    createLessThanGreaterThanToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.LessThanGreaterThanToken, '<>', flags),
    createGreaterThanToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.GreaterThanToken, '>', flags),
    createGreaterThanGreaterThanToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.GreaterThanGreaterThanToken, '>>', flags),
    createGreaterThanGreaterThanEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.GreaterThanGreaterThanEqualsToken, '>>=', flags),
    createGreaterThanGreaterThanGreaterThanToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.GreaterThanGreaterThanGreaterThanToken, '>>>', flags),
    createGreaterThanGreaterThanGreaterThanEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken, '>>>=', flags),
    createGreaterThanEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.GreaterThanEqualsToken, '>=', flags),
    createTildeToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.TildeToken, '~', flags),
    createTildeEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.TildeEqualsToken, '~=', flags),
    createExclamationToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.ExclamationToken, '!', flags),
    createExclamationEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.ExclamationEqualsToken, '!=', flags),
    createExclamationEqualsEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.ExclamationEqualsEqualsToken, '!==', flags),
    createPercentToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.PercentToken, '%', flags),
    createSemiColonToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.SemiColonToken, ';', flags),
    createSemiColonSemiColonToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.SemiColonSemiColonToken, ';;', flags),
    createQuestionToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.QuestionToken, '?', flags),
    createQuestionDotToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.QuestionDotToken, '?.', flags),
    createQuestionQuestionToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.QuestionQuestionToken, '??', flags),
    createQuestionQuestionEqualsToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.QuestionQuestionEqualsToken, '??=', flags),
    createOpenParenToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.OpenParenToken, '(', flags),
    createOpenBracketToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.OpenBracketToken, '[', flags),
    createOpenBraceToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.OpenBraceToken, '{', flags),
    createCloseParenToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.CloseParenToken, ')', flags),
    createCloseBracketToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.CloseBracketToken, ']', flags),
    createCloseBraceToken: (flags = TokenFlags.None): GreenToken => createToken(SyntaxKind.CloseBraceToken, '}', flags),

    // #endregion token
    createNode,
    createBinaryExpressionNode: (left: GreenElement, operator: GreenToken, right: GreenElement): GreenNode => createNode(SyntaxKind.BinaryExpression, [ left, operator, right ]),
  };

  function createToken(kind: SyntaxKind, text: string, flags = TokenFlags.None): Readonly<GreenToken> {
    const cacheKey = `${kind}:${text}:${flags}`;
    const cache = tokenCache.get(cacheKey);
    if (cache) {
      return cache;
    }

    const greenToken: GreenToken = { kind, text, flags };
    tokenCache.set(cacheKey, greenToken);
    return greenToken;
  }
  function createNode(kind: SyntaxKind, children: GreenElement[] = []): Readonly<GreenNode> {
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
  }
});

export type NodeFactory = ReturnType<typeof createGreenNodeFactory>;
