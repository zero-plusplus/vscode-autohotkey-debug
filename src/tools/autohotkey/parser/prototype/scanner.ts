/* eslint-disable no-bitwise */
import { GreenToken, RuntimeTarget, SyntaxKind, TokenFlags } from '../../../../types/tools/autohotkey/parser/common.types';
import { CharacterCodes, ErrorCallback, ScannerHelpers, TokenResolverMap } from '../../../../types/tools/autohotkey/parser/prototype/scanner.types';
import { createGreenNodeFactory } from './greenNodeFactory';

export const supportedTokenMap = {
  [SyntaxKind.EqualsGreaterThanToken]: RuntimeTarget.v2,
  [SyntaxKind.QuestionQuestionToken]: RuntimeTarget.v2,
  [SyntaxKind.QuestionQuestionEqualsToken]: RuntimeTarget.v2,
  [SyntaxKind.ExclamationEqualsEqualsToken]: RuntimeTarget.v2,
  [SyntaxKind.QuestionDotToken]: RuntimeTarget.v2_1,
};
export const removedTokenMap = {
  [SyntaxKind.LessThanGreaterThanToken]: RuntimeTarget.v2,
};
export const createTokenMap = (): TokenResolverMap => {
  return {
    [CharacterCodes.Tab]: scanHorizSpaceTrivias,
    [CharacterCodes.LineFeed]: scanNewLineTrivia,
    [CharacterCodes.CarriageReturn]: scanNewLineTrivia,
    [CharacterCodes.Space]: scanHorizSpaceTrivias,
    [CharacterCodes.Exclamation]: {
      [CharacterCodes.Equals]: {
        [CharacterCodes.Equals]: SyntaxKind.ExclamationEqualsEqualsToken,
        '': SyntaxKind.ExclamationEqualsToken,
      },
      '': SyntaxKind.ExclamationToken,
    },
    [CharacterCodes.DoubleQuotation]: scanStringLiteral,
    [CharacterCodes.Percent]: SyntaxKind.PercentToken,
    [CharacterCodes.Ampersand]: {
      [CharacterCodes.Ampersand]: SyntaxKind.AmpersandAmpersandToken,
      [CharacterCodes.Equals]: SyntaxKind.AmpersandEqualToken,
      '': SyntaxKind.AmpersandToken,
    },
    [CharacterCodes.SingleQuotation]: scanStringLiteral,
    [CharacterCodes.OpenParen]: SyntaxKind.OpenParenToken,
    [CharacterCodes.CloseParen]: SyntaxKind.CloseParenToken,
    [CharacterCodes.Asterisk]: {
      [CharacterCodes.Asterisk]: SyntaxKind.AsteriskAsteriskToken,
      [CharacterCodes.Equals]: SyntaxKind.AsteriskEqualsToken,
      '': SyntaxKind.AsteriskToken,
    },
    [CharacterCodes.Plus]: {
      [CharacterCodes.Plus]: SyntaxKind.PlusPlusToken,
      [CharacterCodes.Equals]: SyntaxKind.PlusEqualsToken,
      '': SyntaxKind.PlusToken,
    },
    [CharacterCodes.Comma]: SyntaxKind.CommaToken,
    [CharacterCodes.Minus]: {
      [CharacterCodes.Minus]: SyntaxKind.MinusMinusToken,
      [CharacterCodes.Equals]: SyntaxKind.MinusEqualsToken,
      '': SyntaxKind.MinusToken,
    },
    [CharacterCodes.Dot]: {
      [CharacterCodes.Equals]: SyntaxKind.DotEqualsToken,
      '': SyntaxKind.DotToken,
    },
    [CharacterCodes.Slash]: {
      [CharacterCodes.Slash]: {
        [CharacterCodes.Equals]: SyntaxKind.SlashSlashEqualsToken,
        '': SyntaxKind.SlashSlashToken,
      },
      [CharacterCodes.Asterisk]: scanBlockCommentTrivia,
      [CharacterCodes.Equals]: SyntaxKind.SlashEqualsToken,
      '': SyntaxKind.SlashToken,
    },
    [CharacterCodes.Colon]: {
      [CharacterCodes.Equals]: SyntaxKind.ColonEqualsToken,
      '': SyntaxKind.ColonToken,
    },
    [CharacterCodes.SemiColon]: scanLineCommentTrivia,
    [CharacterCodes.LessThan]: {
      [CharacterCodes.LessThan]: {
        [CharacterCodes.Equals]: SyntaxKind.LessThanLessThanEqualsToken,
        '': SyntaxKind.LessThanLessThanToken,
      },
      [CharacterCodes.GreaterThan]: SyntaxKind.LessThanGreaterThanToken,
      [CharacterCodes.Equals]: SyntaxKind.LessThanEqualsToken,
      '': SyntaxKind.LessThanToken,
    },
    [CharacterCodes.Equals]: {
      [CharacterCodes.Equals]: {
        '': SyntaxKind.EqualsEqualsToken,
      },
      [CharacterCodes.GreaterThan]: SyntaxKind.EqualsGreaterThanToken,
      '': SyntaxKind.EqualsToken,
    },
    [CharacterCodes.GreaterThan]: {
      [CharacterCodes.GreaterThan]: {
        [CharacterCodes.GreaterThan]: {
          [CharacterCodes.Equals]: SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
          '': SyntaxKind.GreaterThanGreaterThanGreaterThanToken,
        },
        [CharacterCodes.Equals]: SyntaxKind.GreaterThanGreaterThanEqualsToken,
        '': SyntaxKind.GreaterThanGreaterThanToken,
      },
      [CharacterCodes.Equals]: SyntaxKind.GreaterThanEqualsToken,
      '': SyntaxKind.GreaterThanToken,
    },
    [CharacterCodes.Question]: {
      [CharacterCodes.Question]: {
        [CharacterCodes.Equals]: SyntaxKind.QuestionQuestionEqualsToken,
        '': SyntaxKind.QuestionQuestionToken,
      },
      [CharacterCodes.Dot]: SyntaxKind.QuestionDotToken,
      '': SyntaxKind.QuestionToken,
    },
    [CharacterCodes.OpenBracket]: SyntaxKind.OpenBracketToken,
    [CharacterCodes.CloseBracket]: SyntaxKind.CloseBracketToken,
    [CharacterCodes.Caret]: {
      [CharacterCodes.Equals]: SyntaxKind.CaretEqualsToken,
      '': SyntaxKind.CaretToken,
    },
    [CharacterCodes.OpenBrace]: SyntaxKind.OpenBraceToken,
    [CharacterCodes.Bar]: {
      [CharacterCodes.Bar]: SyntaxKind.BarBarToken,
      [CharacterCodes.Equals]: SyntaxKind.BarEqualsToken,
      '': SyntaxKind.BarToken,
    },
    [CharacterCodes.CloseBrace]: SyntaxKind.CloseBraceToken,
    [CharacterCodes.Tilde]: {
      [CharacterCodes.Equals]: SyntaxKind.TildeEqualsToken,
      '': SyntaxKind.TildeToken,
    },
    [CharacterCodes.Bom]: SyntaxKind.Bom,
    [CharacterCodes._0]: scanNumberLiteral,
    [CharacterCodes._1]: scanNumberLiteral,
    [CharacterCodes._2]: scanNumberLiteral,
    [CharacterCodes._3]: scanNumberLiteral,
    [CharacterCodes._4]: scanNumberLiteral,
    [CharacterCodes._5]: scanNumberLiteral,
    [CharacterCodes._6]: scanNumberLiteral,
    [CharacterCodes._7]: scanNumberLiteral,
    [CharacterCodes._8]: scanNumberLiteral,
    [CharacterCodes._9]: scanNumberLiteral,
  };
};

const defaultErrorCallback: ErrorCallback = (message: string) => {
};
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createScanner(initialRuntimeTarget: RuntimeTarget, sourceText = '', onError = defaultErrorCallback, start?: number, length?: number) {
  const factory = createGreenNodeFactory();
  const tokenMap = createTokenMap();
  let runtimeTarget = initialRuntimeTarget;
  let text = sourceText;

  // context
  let endPosition: number;
  let currentPosition: number;
  let currentToken: GreenToken | undefined;
  let tokenStart = 0;
  let tokenFlags = TokenFlags.None;
  let peekCache: GreenToken | undefined;

  const helpers: ScannerHelpers = {
    get runtimeTarget() {
      return runtimeTarget;
    },
    hasTokenFlag,
    appendTokenFlag,
    isTerminate,
    getCharCode,
    getCharCodeByOffset,
    advance,
    advanceByRegExp,
    expect,
    expectNext,
    commit,
  };
  // #endregion helpers

  const scanner = {
    getText: (): string => text,
    getToken: (): GreenToken | undefined => currentToken,
    setRuntimeTarget: (newRuntimeTarget: RuntimeTarget): void => {
      runtimeTarget = newRuntimeTarget;
    },
    setText(newText: string | undefined, start?: number, length?: number): void {
      text = newText ?? '';
      endPosition = length === undefined ? text.length : start! + length;
      resetTokenState(start);
    },
    scan(): GreenToken {
      const { isTerminate: isTerminateScan, commit } = helpers;

      if (peekCache) {
        const token = peekCache;
        peekCache = undefined;
        return token;
      }

      let currentTokenMap = tokenMap;
      let tokenLength = 0;
      while (true) {
        if (isTerminateScan()) {
          return commit(SyntaxKind.EndOfFileToken);
        }

        if (currentTokenMap === tokenMap) {
          tokenStart = currentPosition;
        }

        const charCode = getCharCodeByOffset(tokenLength);
        const matchedSignTokenResolver = currentTokenMap[''];
        const signTokenResolver = charCode in currentTokenMap ? currentTokenMap[charCode] : matchedSignTokenResolver;
        if (!signTokenResolver) {
          return scanIdentifierOrKeyword(helpers);
        }
        if (signTokenResolver !== matchedSignTokenResolver) {
          tokenLength++;
        }

        if (Array.isArray(signTokenResolver)) {
          if (signTokenResolver[0] instanceof RegExp) {
            return resolveTokenByRegExp(signTokenResolver);
          }
          throw Error('Unsupported token resolver specified.');
        }
        if (typeof signTokenResolver === 'object') {
          currentTokenMap = signTokenResolver;
          continue;
        }
        else if (typeof signTokenResolver === 'function') {
          return signTokenResolver(helpers);
        }
        else if (typeof signTokenResolver === 'string') {
          return resolveTokenBySyntaxKind(signTokenResolver, tokenLength);
        }
        tokenLength++;
      }
    },
    tryScan<T>(callback: () => T): T {
      const snapshot = createSnapshot();
      const result = callback();
      if (!result) {
        snapshot.restore();
      }
      return result;
    },
    lookAhead,
    peek,
  };
  scanner.setText(text, start, length);
  return scanner;

  // #region scanner
  function createSnapshot(): { restore: () => void } {
    const currentToken_bk = currentToken;
    const currentPosition_bk = currentPosition;
    const tokenStart_bk = tokenStart;

    return {
      restore(): void {
        currentToken = currentToken_bk;
        currentPosition = currentPosition_bk;
        tokenStart = tokenStart_bk;
      },
    };
  }
  function resetTokenState(start = 0): void {
    currentPosition = start;
    currentToken = undefined;
    tokenStart = start;
    tokenFlags = TokenFlags.None;
    peekCache = undefined;
  }
  function lookAhead<T>(callback: () => T): T {
    const snapshot = createSnapshot();
    const result = callback();
    snapshot.restore();
    return result;
  }
  function peek(): GreenToken {
    if (peekCache) {
      return peekCache;
    }

    return lookAhead(() => {
      peekCache = scanner.scan();
      return peekCache;
    });
  }
  // #endregion scanner

  // #region scanner helpers
  function isTerminate(): boolean {
    return endPosition <= currentPosition;
  }
  function hasTokenFlag(flag: TokenFlags): boolean {
    if (tokenFlags & flag) {
      return true;
    }
    return false;
  }
  function appendTokenFlag(...flags: TokenFlags[]): void {
    for (const flag of flags) {
      tokenFlags |= flag;
    }
  }
  function getCharCodeByOffset(offset = 0): number {
    return text.charCodeAt(currentPosition + offset);
  }
  function getCharCode(): number {
    return getCharCodeByOffset(0);
  }
  // function getTokenValue(): string {
  //   return tokenText;
  // }
  function expect(expect: CharacterCodes, offset = 0): boolean {
    const charCode = getCharCodeByOffset(offset);
    if (charCode === expect) {
      return true;
    }
    return false;
  }
  function expectNext(expectCharCode: number): boolean {
    return expect(expectCharCode, 1);
  }
  function advance(): void {
    const charCode = getCharCode();
    if (isFullWidthChar(charCode)) {
      currentPosition++;
    }
    currentPosition++;
  }
  function advanceByLength(length: number): void {
    for (let count = length; 0 < count; count--) {
      advance();
    }
  }
  function advanceByRegExp(regexp: RegExp, length?: number): number {
    const targetText = length ? text.slice(currentPosition, currentPosition + length) : text.slice(currentPosition);
    const match = targetText.match(regexp);
    if (!match?.[0]) {
      return 0;
    }
    if (match.index === 0) {
      const matched = text.slice(currentPosition, match[0].length);
      currentPosition += matched.length;
      return matched.length;
    }
    return 0;
  }
  function commit(syntaxKind: SyntaxKind): GreenToken {
    const tokenText = text.slice(tokenStart, currentPosition);
    return factory.createToken(syntaxKind, tokenText, tokenFlags);
  }
  // #endregion scanner helpers

  // #region utils
  function resolveTokenBySyntaxKind(syntaxKind: SyntaxKind, length: number): GreenToken {
    advanceByLength(length);

    const supportedVersion = supportedTokenMap[syntaxKind] as RuntimeTarget | undefined;
    if (supportedVersion && runtimeTarget < supportedVersion) {
      appendTokenFlag(TokenFlags.Unsupported);
    }

    const removedVersion = removedTokenMap[syntaxKind] as RuntimeTarget | undefined;
    if (removedVersion && removedVersion < runtimeTarget) {
      appendTokenFlag(TokenFlags.Removed);
    }

    return commit(syntaxKind);
  }
  function resolveTokenByRegExp([ regexp, kind ]: [ RegExp, SyntaxKind ]): GreenToken {
    const { advanceByRegExp } = helpers;
    advanceByRegExp(regexp);
    return commit(kind);
  }
  // #endregion utils
}
export type Scanner = ReturnType<typeof createScanner>;

export function scanNewLineTrivia(helpers: ScannerHelpers): GreenToken {
  const { getCharCode, advance, commit } = helpers;
  const charCode = getCharCode();
  if (charCode === CharacterCodes.LineFeed) {
    advance();
    return commit(SyntaxKind.NewLineTrivia);
  }
  else if (charCode === CharacterCodes.CarriageReturn) {
    advance();
    const nextCharCode = getCharCode();
    if (nextCharCode === CharacterCodes.LineFeed) {
      advance();
    }
    return commit(SyntaxKind.NewLineTrivia);
  }
  throw Error('The current character is not a line break.');
}
export function scanHorizSpaceTrivias(helpers: ScannerHelpers): GreenToken {
  const { isTerminate: isTerminateScan, getCharCode, advance, commit } = helpers;
  const charCode = getCharCode();
  if (!isHorizSpaceTrivia(charCode)) {
    throw Error('The current character is not a space or tab.');
  }

  advance();
  while (true) {
    if (isTerminateScan()) {
      break;
    }

    const charCode = getCharCode();
    if (!isHorizSpaceTrivia(charCode)) {
      break;
    }

    advance();
  }
  return commit(SyntaxKind.HorizSpaceTrivia);
}
export function scanLineCommentTrivia(helpers: ScannerHelpers): GreenToken {
  const { isTerminate, getCharCode, advance, commit } = helpers;

  const charCode = getCharCode();
  if (charCode !== CharacterCodes.SemiColon) {
    throw Error('The current character is not a semi-colon.');
  }

  advance();
  while (true) {
    const charCode = getCharCode();
    if (isTerminate() || isNewLineTrivia(charCode)) {
      break;
    }
    advance(charCode);
  }


  return commit(SyntaxKind.LineCommentTrivia);
}
export function scanBlockCommentTrivia(helpers: ScannerHelpers): GreenToken {
  const { isTerminate, expect, getCharCode, advance, commit } = helpers;

  if (!expect(CharacterCodes.Slash)) {
    throw Error('The current character is not a slash.');
  }
  advance();

  if (!expect(CharacterCodes.Asterisk)) {
    throw Error('The current character is not a slash.');
  }
  advance();

  while (true) {
    if (isTerminate()) {
      break;
    }

    const charCode = getCharCode();
    if (charCode === CharacterCodes.Asterisk) {
      advance();
      const nextCharCode = getCharCode();
      if (nextCharCode === CharacterCodes.Slash) {
        advance();
        break;
      }
    }
    advance();
  }
  return commit(SyntaxKind.BlockCommentTrivia);
}
function scanIdentifierOrKeyword(helpers: ScannerHelpers): GreenToken {
  const { runtimeTarget, advanceByRegExp, commit } = helpers;

  // AutoHotkey v1: https://www.autohotkey.com/docs/v1/Concepts.htm#names
  // AutoHotkey v2: https://www.autohotkey.com/docs/v2/Concepts.htm#names
  const regexp = RuntimeTarget.v1 < runtimeTarget
    ? /[\w_][\w0-9_]{0,253}/u
    : /[\w@#$_][\w0-9@#$_]{0,253}/u;
  advanceByRegExp(regexp);

  const identifierToken = commit(SyntaxKind.Identifier);
  return toKeywordToken(identifierToken) ?? identifierToken;

  function toKeywordToken(token: GreenToken): GreenToken | undefined {
    switch (identifierToken.text) {
      // reserved words
      case 'as': return commit(RuntimeTarget.v2 <= runtimeTarget ? SyntaxKind.AsKeyword : SyntaxKind.Identifier);
      case 'and': return commit(SyntaxKind.AndKeyword);
      case 'contains': return commit(SyntaxKind.ContainsKeyword);
      case 'false': return commit(SyntaxKind.FalseKeyword);
      case 'in': return commit(SyntaxKind.InKeyword);
      case 'is': return commit(SyntaxKind.IsKeyword);
      case 'isset': return commit(RuntimeTarget.v2 <= runtimeTarget ? SyntaxKind.IsSetKeyword : SyntaxKind.Identifier);
      case 'not': return commit(SyntaxKind.NotKeyword);
      case 'or': return commit(SyntaxKind.OrKeyword);
      case 'super': return commit(SyntaxKind.SuperKeyword);
      case 'true': return commit(SyntaxKind.TrueKeyword);
      case 'unset': return commit(SyntaxKind.UnsetKeyword);
      // keywords
      case 'break': return commit(SyntaxKind.BreakKeyword);
      case 'case': return commit(SyntaxKind.CaseKeyword);
      case 'catch': return commit(SyntaxKind.CatchKeyword);
      case 'class': return commit(SyntaxKind.ClassKeyword);
      case 'extends': return commit(SyntaxKind.ExtendsKeyword);
      case 'continue': return commit(SyntaxKind.ContinueKeyword);
      case 'else': return commit(SyntaxKind.ElseKeyword);
      case 'finally': return commit(SyntaxKind.FinallyKeyword);
      case 'for': return commit(SyntaxKind.ForKeyword);
      case 'get': return commit(SyntaxKind.GetKeyword);
      case 'global': return commit(SyntaxKind.GlobalKeyword);
      case 'goto': return commit(SyntaxKind.GotoKeyword);
      case 'if': return commit(SyntaxKind.IfKeyword);
      case 'local': return commit(SyntaxKind.LocalKeyword);
      case 'loop': return commit(SyntaxKind.LoopKeyword);
      case 'return': return commit(SyntaxKind.ReturnKeyword);
      case 'set': return commit(SyntaxKind.SetKeyword);
      case 'static': return commit(SyntaxKind.StaticKeyword);
      case 'switch': return commit(SyntaxKind.SwitchKeyword);
      case 'throw': return commit(SyntaxKind.ThrowKeyword);
      case 'try': return commit(SyntaxKind.TryKeyword);
      case 'until': return commit(SyntaxKind.UntilKeyword);
      case 'while': return commit(SyntaxKind.WhileKeyword);
      default: break;
    }
    return undefined;
  }
}

export function scanStringLiteral(helpers: ScannerHelpers): GreenToken {
  const { isTerminate, advance, getCharCode, runtimeTarget, commit } = helpers;

  // v1: https://www.autohotkey.com/docs/v1/Language.htm#strings
  // v2: https://www.autohotkey.com/docs/v2/Language.htm#strings
  const quote = getCharCode();
  advance(quote);

  while (true) {
    const current = getCharCode();
    if (isTerminate() || isNewLineTrivia(current)) {
      break;
    }

    if (current === quote) {
      // In v1, `""` is treated as an escape sequence.
      advance(current);
      if (runtimeTarget < RuntimeTarget.v2 && current === getCharCode()) {
        advance();
        continue;
      }
      break;
    }

    advance(current);
  }

  // if (quote === CharacterCodes.SingleQuotation && runtimeTarget === RuntimeTarget.v1) {
  //   appendTokenFlag(TokenFlags.UnSupported);
  // }
  return commit(SyntaxKind.StringLiteral);
}
export function scanNumberLiteral(helpers: ScannerHelpers): GreenToken {
  const { isTerminate: isTerminateScan, hasTokenFlag, appendTokenFlag, getCharCode, advance, expect, commit } = helpers;

  // v1: https://www.autohotkey.com/docs/v1/Concepts.htm#numbers
  // v2: https://www.autohotkey.com/docs/v2/Concepts.htm#numbers

  // consume leading zero (e.g. `0123`) or hex (e.g. `0x123`)
  if (expect(CharacterCodes._0)) {
    advance(); // consume `0`

    if (expect(CharacterCodes._x) || expect(CharacterCodes._X)) {
      advance(); // consume `x` or `X`

      advanceHex();
      return commit(SyntaxKind.NumberLiteral);
    }

    appendTokenFlag(TokenFlags.ContainsLeadingZero);
    advanceLeadingZero();
  }

  // consume decimal or float
  advanceDecimal();
  if (expect(CharacterCodes.Dot)) {
    advance();
    advanceDecimalPart();
    appendTokenFlag(TokenFlags.FloatNumber);
  }

  // consume scientific notation
  if (hasTokenFlag(TokenFlags.FloatNumber)) {
    if (expect(CharacterCodes._e) || expect(CharacterCodes._E)) {
      advance();

      if (expect(CharacterCodes.Plus) || expect(CharacterCodes.Minus)) {
        advance();
      }

      advanceDecimal();
      appendTokenFlag(TokenFlags.ScientificNotationNumber);
    }
  }
  return commit(SyntaxKind.NumberLiteral);

  function advanceLeadingZero(): void {
    while (expect(CharacterCodes._0)) {
      advance();
    }
  }
  function advanceDecimal(): void {
    const charCode = getCharCode();
    if (charCode === CharacterCodes._0) {
      return;
    }
    advanceDecimalPart();
  }
  function advanceDecimalPart(): void {
    while (true) {
      if (isTerminateScan()) {
        break;
      }

      const current = getCharCode();
      if (isNumber(current)) {
        advance();
        continue;
      }
      break;
    }
  }
  function advanceHex(): void {
    appendTokenFlag(TokenFlags.HexNumber);

    while (true) {
      if (isTerminateScan()) {
        break;
      }

      const current = getCharCode();
      switch (true) {
        case isNumber(current):
        case current === CharacterCodes._a:
        case current === CharacterCodes._b:
        case current === CharacterCodes._c:
        case current === CharacterCodes._d:
        case current === CharacterCodes._e:
        case current === CharacterCodes._f:
        case current === CharacterCodes._A:
        case current === CharacterCodes._B:
        case current === CharacterCodes._C:
        case current === CharacterCodes._D:
        case current === CharacterCodes._E:
        case current === CharacterCodes._F: {
          advance();
          continue;
        }
        default: break;
      }
      break;
    }
  }
}

export const isNewLineTrivia = (charCode: number): boolean => {
  switch (charCode) {
    case CharacterCodes.LineFeed:
    case CharacterCodes.CarriageReturn: return true;
    default: break;
  }
  return false;
};
export const isHorizSpaceTrivia = (charCode: number): boolean => {
  switch (charCode) {
    case CharacterCodes.Space:
    case CharacterCodes.Tab: return true;
    default: break;
  }
  return false;
};
export const isNumber = (charCode: number): boolean => {
  return CharacterCodes._0 <= charCode && charCode <= CharacterCodes._9;
};
export const isFullWidthChar = (charCode: number): boolean => {
  return CharacterCodes.FullWidthStart <= charCode;
};
