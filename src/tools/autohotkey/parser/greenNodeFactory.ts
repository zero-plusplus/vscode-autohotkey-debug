import { GreenElement, GreenNode, GreenToken, SyntaxKind } from '../../../types/tools/autohotkey/parser/common.types';
import { toNumber } from '../../convert';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createGreenNodeFactory = () => {
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
    createStringLiteral: (number: number | `${number}`): GreenToken => createToken(SyntaxKind.NumberLiteral, String(toNumber(number, 0))),
    createNumberLiteral: (number: number | `${number}`): GreenToken => createToken(SyntaxKind.NumberLiteral, String(toNumber(number, 0))),
    createPlusToken: (): GreenToken => createToken(SyntaxKind.PlusToken, '+'),
    createPlusPlusToken: (): GreenToken => createToken(SyntaxKind.PlusPlusToken, '++'),
    createPlusEqualsToken: (): GreenToken => createToken(SyntaxKind.PlusEqualsToken, '+='),
    createMinusToken: (): GreenToken => createToken(SyntaxKind.MinusToken, '-'),
    createMinusMinusToken: (): GreenToken => createToken(SyntaxKind.MinusMinusToken, '--'),
    createMinusEqualsToken: (): GreenToken => createToken(SyntaxKind.MinusEqualsToken, '-='),
    createAsteriskToken: (): GreenToken => createToken(SyntaxKind.AsteriskToken, '*'),
    createAsteriskAsteriskToken: (): GreenToken => createToken(SyntaxKind.AsteriskAsteriskToken, '**'),
    createAsteriskEqualsToken: (): GreenToken => createToken(SyntaxKind.AsteriskEqualsToken, '*='),
    createSlashToken: (): GreenToken => createToken(SyntaxKind.SlashToken, '/'),
    createSlashSlashToken: (): GreenToken => createToken(SyntaxKind.SlashSlashToken, '//'),
    createSlashEqualsToken: (): GreenToken => createToken(SyntaxKind.SlashEqualsToken, '/='),
    createSlashSlashEqualsToken: (): GreenToken => createToken(SyntaxKind.SlashSlashEqualsToken, '//='),
    createColonToken: (): GreenToken => createToken(SyntaxKind.ColonToken, ':'),
    createColonEqualsToken: (): GreenToken => createToken(SyntaxKind.ColonEqualsToken, ':='),
    createCommaToken: (): GreenToken => createToken(SyntaxKind.CommaToken, ','),
    createEqualsToken: (): GreenToken => createToken(SyntaxKind.EqualsToken, '='),
    createEqualsEqualsToken: (): GreenToken => createToken(SyntaxKind.EqualsEqualsToken, '=='),
    createEqualsGreaterThanToken: (): GreenToken => createToken(SyntaxKind.EqualsGreaterThanToken, '=>'),
    createDotToken: (): GreenToken => createToken(SyntaxKind.DotToken, '.'),
    createDotEqualsToken: (): GreenToken => createToken(SyntaxKind.DotEqualsToken, '.='),
    createBarToken: (): GreenToken => createToken(SyntaxKind.BarToken, '|'),
    createBarBarToken: (): GreenToken => createToken(SyntaxKind.BarBarToken, '||'),
    createBarEqualsToken: (): GreenToken => createToken(SyntaxKind.BarEqualsToken, '|='),
    createAmpersandToken: (): GreenToken => createToken(SyntaxKind.AmpersandToken, '&'),
    createAmpersandAmpersandToken: (): GreenToken => createToken(SyntaxKind.AmpersandAmpersandToken, '&&'),
    createAmpersandEqualToken: (): GreenToken => createToken(SyntaxKind.AmpersandEqualToken, '&='),
    createCaretToken: (): GreenToken => createToken(SyntaxKind.CaretToken, '^'),
    createCaretEqualsToken: (): GreenToken => createToken(SyntaxKind.CaretEqualsToken, '^='),
    createLessThanToken: (): GreenToken => createToken(SyntaxKind.LessThanToken, '<'),
    createLessThanEqualsToken: (): GreenToken => createToken(SyntaxKind.LessThanEqualsToken, '<='),
    createLessThanLessThanToken: (): GreenToken => createToken(SyntaxKind.LessThanLessThanToken, '<<'),
    createLessThanLessThanEqualsToken: (): GreenToken => createToken(SyntaxKind.LessThanLessThanEqualsToken, '<<='),
    createLessThanGreaterThanToken: (): GreenToken => createToken(SyntaxKind.LessThanGreaterThanToken, '<>'),
    createGreaterThanToken: (): GreenToken => createToken(SyntaxKind.GreaterThanToken, '>'),
    createGreaterThanGreaterThanToken: (): GreenToken => createToken(SyntaxKind.GreaterThanGreaterThanToken, '>>'),
    createGreaterThanGreaterThanEqualsToken: (): GreenToken => createToken(SyntaxKind.GreaterThanGreaterThanEqualsToken, '>>='),
    createGreaterThanGreaterThanGreaterThanToken: (): GreenToken => createToken(SyntaxKind.GreaterThanGreaterThanGreaterThanToken, '>>>'),
    createGreaterThanGreaterThanGreaterThanEqualsToken: (): GreenToken => createToken(SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken, '>>>='),
    createGreaterThanEqualsToken: (): GreenToken => createToken(SyntaxKind.GreaterThanEqualsToken, '>='),
    createTildeToken: (): GreenToken => createToken(SyntaxKind.TildeToken, '~'),
    createTildeEqualsToken: (): GreenToken => createToken(SyntaxKind.TildeEqualsToken, '~='),
    createExclamationToken: (): GreenToken => createToken(SyntaxKind.ExclamationToken, '!'),
    createExclamationEqualsToken: (): GreenToken => createToken(SyntaxKind.ExclamationEqualsToken, '!='),
    createExclamationEqualsEqualsToken: (): GreenToken => createToken(SyntaxKind.ExclamationEqualsEqualsToken, '!=='),
    createPercentToken: (): GreenToken => createToken(SyntaxKind.PercentToken, '%'),
    createSemiColonToken: (): GreenToken => createToken(SyntaxKind.SemiColonToken, ';'),
    createSemiColonSemiColonToken: (): GreenToken => createToken(SyntaxKind.SemiColonSemiColonToken, ';;'),
    createQuestionToken: (): GreenToken => createToken(SyntaxKind.QuestionToken, '?'),
    createQuestionDotToken: (): GreenToken => createToken(SyntaxKind.QuestionDotToken, '?.'),
    createQuestionQuestionToken: (): GreenToken => createToken(SyntaxKind.QuestionQuestionToken, '??'),
    createQuestionQuestionEqualsToken: (): GreenToken => createToken(SyntaxKind.QuestionQuestionEqualsToken, '??='),
    createOpenParenToken: (): GreenToken => createToken(SyntaxKind.OpenParenToken, '('),
    createOpenBracketToken: (): GreenToken => createToken(SyntaxKind.OpenBracketToken, '['),
    createOpenBraceToken: (): GreenToken => createToken(SyntaxKind.OpenBraceToken, '{'),
    createCloseParenToken: (): GreenToken => createToken(SyntaxKind.CloseParenToken, ')'),
    createCloseBracketToken: (): GreenToken => createToken(SyntaxKind.CloseBracketToken, ']'),
    createCloseBraceToken: (): GreenToken => createToken(SyntaxKind.CloseBraceToken, '}'),

    // #endregion token
    createNode,
  };

  function createToken(kind: SyntaxKind, text: string): Readonly<GreenToken> {
    const cacheKey = `${kind}:${text}`;
    const cache = tokenCache.get(cacheKey);
    if (cache) {
      return cache;
    }

    const greenToken: GreenToken = { kind, text };
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
};
