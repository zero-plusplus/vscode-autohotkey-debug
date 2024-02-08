/* eslint-disable no-bitwise */
import { CharacterCodes, ErrorCallback, RuntimeTarget, ScannerHelpers, SyntaxKind, TokenFlags, TokenResolverMap } from '../../../types/tools/autohotkey/detector';

export const supportedTokenMap = {
  [SyntaxKind.EqualsGreaterThanToken]: RuntimeTarget.v2,
  [SyntaxKind.QuestionQuestionToken]: RuntimeTarget.v2,
  [SyntaxKind.QuestionQuestionEqualsToken]: RuntimeTarget.v2,
  [SyntaxKind.ExclamationEqualsEqualsToken]: RuntimeTarget.v2,
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
  };
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createScanner(runtimeTarget: RuntimeTarget, sourceText: string, onError: ErrorCallback = (message: string): void => undefined, skipTrivia = false, start?: number, length?: number) {
  const tokenMap = createTokenMap();
  let text = sourceText;
  let endPosition: number;

  // current state
  let position: number;
  let fullStartPosition: number;
  let tokenStart: number;
  let tokenSyntaxKind: SyntaxKind;
  let tokenValue: string;
  let tokenFlags: TokenFlags;

  // snapshot state
  let freezeSnapshot = false;
  let position_snapshot: number | undefined;
  let fullStartPosition_snapshot: number | undefined;
  let tokenStart_snapshot: number | undefined;
  let tokenSyntaxKind_snapshot: SyntaxKind | undefined;
  let tokenValue_snapshot: string | undefined;
  let tokenFlags_snapshot: TokenFlags | undefined;

  // #region helpers
  const isTerminateScan = (): boolean => {
    return endPosition <= position;
  };
  const getCharCodeByOffset = (offset = 0): number => {
    return text.charCodeAt(position + offset);
  };
  const getCharCode = (): number => {
    return getCharCodeByOffset(0);
  };
  const expect = (expect: CharacterCodes, skipTrivia = false, initialOffset = 0): boolean => {
    let offset = initialOffset;
    while (true) {
      if (isTerminateScan()) {
        return false;
      }

      const charCode = getCharCodeByOffset(offset);
      if (skipTrivia && isHorizSpaceTrivia(charCode)) {
        offset++;
        continue;
      }
      if (charCode === expect) {
        return true;
      }
      break;
    }
    return false;
  };
  const helpers: ScannerHelpers = {
    isTerminateScan,
    isSkipTrivia: () => skipTrivia,
    hasTokenFlag(flag: TokenFlags): boolean {
      if (tokenFlags & flag) {
        return true;
      }
      return false;
    },
    getCharCode,
    getCharCodeByOffset,
    getTokenValue(): string {
      return tokenValue;
    },
    getRuntimeTarget(): RuntimeTarget {
      return runtimeTarget;
    },
    appendTokenFlag(...flags): void {
      for (const flag of flags) {
        tokenFlags |= flag;
      }
    },
    advance(currentCode?: number): void {
      const charCode = currentCode ?? getCharCode();
      if (isFullWidthChar(charCode)) {
        position++;
      }
      position++;
    },
    expect,
    expectNext(expectCharCode: number, skipTrivia = false): boolean {
      return expect(expectCharCode, skipTrivia, 1);
    },
    commit<T extends SyntaxKind = SyntaxKind.Unknown>(syntaxKind?: SyntaxKind, value?: string): T {
      tokenSyntaxKind = syntaxKind ?? SyntaxKind.Unknown;
      tokenValue = value ?? text.slice(tokenStart, position);
      if (syntaxKind && syntaxKind in supportedTokenMap) {
        tokenFlags |= TokenFlags.UnSupported;
      }
      return tokenSyntaxKind as T;
    },
  };
  // #endregion helpers

  const scanner = {
    isHorizSpaceTrivia(): boolean {
      const token = this.getTokenSyntaxKind();
      if (token === SyntaxKind.HorizSpaceTrivia) {
        return true;
      }
      return false;
    },
    isTriviaToken(): boolean {
      switch (this.getTokenSyntaxKind()) {
        case SyntaxKind.HorizSpaceTrivia:
        case SyntaxKind.NewLineTrivia:
        case SyntaxKind.LineCommentTrivia:
        case SyntaxKind.BlockCommentTrivia:
        case SyntaxKind.CommentDirectiveTrivia: return true;
        default: break;
      }
      return false;
    },
    getFullStartPosition: (): number => fullStartPosition,
    getText: (): string => text,
    getTokenSyntaxKind: (): SyntaxKind => tokenSyntaxKind,
    getTokenFlags: (): number => tokenFlags,
    getTokenStart: (): number => tokenStart,
    getTokenValue: (): string => tokenValue,
    setText(newText: string | undefined, start?: number, length?: number): void {
      text = newText ?? '';
      endPosition = length === undefined ? text.length : start! + length;
      this.resetTokenState(start ?? 0);
    },
    scan(): SyntaxKind {
      const { isTerminateScan, advance, commit } = helpers;

      fullStartPosition = position;
      tokenFlags = TokenFlags.None;

      let currentTokenMap = tokenMap;
      let offset = 0;
      while (true) {
        if (isTerminateScan()) {
          return commit(SyntaxKind.EndOfFileToken);
        }

        if (currentTokenMap === tokenMap) {
          tokenStart = position;
        }

        const charCode = getCharCodeByOffset(offset);
        const matchedSignTokenResolver = currentTokenMap[''];
        const signTokenResolver = charCode in currentTokenMap ? currentTokenMap[charCode] : matchedSignTokenResolver;
        if (!signTokenResolver) {
          const syntaxKind = isNumber(charCode) ? scanNumberLiteral(helpers) : scanIdentifier(helpers);
          if (syntaxKind) {
            return commit(syntaxKind);
          }
          advance();
          return commit(SyntaxKind.Unknown);
        }
        if (signTokenResolver !== matchedSignTokenResolver) {
          offset++;
        }

        if (typeof signTokenResolver === 'object') {
          currentTokenMap = signTokenResolver;
          continue;
        }
        else if (typeof signTokenResolver === 'function') {
          const syntaxKind = signTokenResolver(helpers);
          if (syntaxKind) {
            return commit(syntaxKind);
          }
          currentTokenMap = tokenMap;
          offset = 0;
          continue;
        }
        else if (typeof signTokenResolver === 'number') {
          for (let count = offset; 0 < count; count--) {
            advance();
          }
          const syntaxKind = signTokenResolver;
          currentTokenMap = tokenMap;
          offset = 0;
          return commit(syntaxKind);
        }
        offset++;
      }
    },
    tryScan<T>(callback: () => T): T {
      freezeSnapshot = true;
      this.createSnapshot();
      const result = callback();
      if (!result) {
        this.restoreFromSnapshot();
      }
      freezeSnapshot = false;
      return result;
    },
    lookAhead<T>(callback: () => T): T {
      this.createSnapshot();
      const result = callback();
      this.restoreFromSnapshot();
      return result;
    },
    createSnapshot(): void {
      if (freezeSnapshot) {
        return;
      }

      position_snapshot = position;
      fullStartPosition_snapshot = fullStartPosition;
      tokenStart_snapshot = tokenStart;
      tokenSyntaxKind_snapshot = tokenSyntaxKind;
      tokenValue_snapshot = tokenValue;
      tokenFlags_snapshot = tokenFlags;
    },
    restoreFromSnapshot(): void {
      position = position_snapshot ?? position;
      fullStartPosition = fullStartPosition_snapshot ?? fullStartPosition;
      tokenStart = tokenStart_snapshot ?? tokenStart;
      tokenSyntaxKind = tokenSyntaxKind_snapshot ?? tokenSyntaxKind;
      tokenValue = tokenValue_snapshot ?? tokenValue;
      tokenFlags = tokenFlags_snapshot ?? tokenFlags;
    },
    scanAhk2ExeComment(): SyntaxKind {
      return SyntaxKind.Unknown;
    },
    scanAhkDoc(): SyntaxKind {
      return SyntaxKind.Unknown;
    },
    scanRawString(): SyntaxKind | undefined {
      const { isTerminateScan, appendTokenFlag, getCharCode, advance, expect, commit } = helpers;

      fullStartPosition = position;
      tokenStart = position;
      tokenFlags = TokenFlags.None;

      const charCode = getCharCode();
      if (isWhiteSpaceTrivia(charCode)) {
        const syntaxKind = isHorizSpaceTrivia(charCode) ? scanHorizSpaceTrivias(helpers) : scanNewLineTrivia(helpers);
        if (!syntaxKind || skipTrivia) {
          this.resetTokenState(position);
          return this.scanRawString();
        }
        return commit(syntaxKind);
      }

      while (true) {
        if (isTerminateScan()) {
          break;
        }

        const charCode = getCharCode();
        if (isHorizSpaceTrivia(charCode)) {
          let isCommaAfterSpace = false;
          const savePosition = position;
          while (true) {
            if (isTerminateScan()) {
              break;
            }

            const charCode = getCharCode();
            if (charCode === CharacterCodes.Comma) {
              isCommaAfterSpace = true;
              position = savePosition;
              break;
            }
            if (!isHorizSpaceTrivia(charCode)) {
              break;
            }

            advance();
          }


          if (isCommaAfterSpace) {
            break;
          }
          continue;
        }

        if (isNewLineTrivia(charCode)) {
          break;
        }
        if (charCode === CharacterCodes.Comma) {
          break;
        }
        if (charCode === CharacterCodes.Percent) {
          break;
        }

        // https://www.autohotkey.com/docs/v1/misc/EscapeChar.htm
        if (charCode === CharacterCodes.Backtick) {
          advance();

          const charCode = getCharCode();
          switch (charCode) {
            case CharacterCodes.Comma:
            case CharacterCodes.Percent:
            case CharacterCodes.Backtick:
            case CharacterCodes.SemiColon:
            case CharacterCodes._n:
            case CharacterCodes._N:
            case CharacterCodes._r:
            case CharacterCodes._R:
            case CharacterCodes._b:
            case CharacterCodes._B:
            case CharacterCodes._t:
            case CharacterCodes._T:
            case CharacterCodes._v:
            case CharacterCodes._V:
            case CharacterCodes._a:
            case CharacterCodes._A:
            case CharacterCodes._f:
            case CharacterCodes._F: {
              advance();
              break;
            }
            case CharacterCodes.Colon: {
              advance();
              if (expect(CharacterCodes.Colon)) {
                advance();
              }
              break;
            }
            default: {
              appendTokenFlag(TokenFlags.ContainsInvalidEscape);
              advance();
              break;
            }
          }
          continue;
        }
        advance();
      }
      commit();

      if (this.getTokenValue() === '') {
        return undefined;
      }
      return commit(SyntaxKind.RawString);
    },
    resetTokenState(pos: number): void {
      position = pos;
      fullStartPosition = pos;
      tokenStart = pos;
      tokenSyntaxKind = SyntaxKind.Unknown;
    },
  };
  scanner.setText(text, start, length);
  return scanner;
}
export type Scanner = ReturnType<typeof createScanner>;

function scanNewLineTrivia(helpers: ScannerHelpers): SyntaxKind | undefined {
  const { isSkipTrivia, getCharCode, advance, commit } = helpers;
  const charCode = getCharCode();
  if (charCode === CharacterCodes.LineFeed) {
    advance();
    if (isSkipTrivia()) {
      return undefined;
    }
    return commit(SyntaxKind.NewLineTrivia);
  }
  else if (charCode === CharacterCodes.CarriageReturn) {
    advance();
    const nextCharCode = getCharCode();
    if (nextCharCode === CharacterCodes.LineFeed) {
      advance();
    }
    if (isSkipTrivia()) {
      return undefined;
    }
    return commit(SyntaxKind.NewLineTrivia);
  }
  return undefined;
}
function scanHorizSpaceTrivias(helpers: ScannerHelpers): SyntaxKind | undefined {
  const { isTerminateScan, isSkipTrivia, getCharCode, advance, commit } = helpers;
  while (true) {
    if (isTerminateScan()) {
      break;
    }

    const charCode = getCharCode();
    if (isHorizSpaceTrivia(charCode)) {
      advance();
      continue;
    }

    break;
  }

  if (isSkipTrivia()) {
    return undefined;
  }
  return commit(SyntaxKind.HorizSpaceTrivia);
}
function scanLineCommentTrivia(helpers: ScannerHelpers): SyntaxKind {
  const { isTerminateScan, getCharCode, advance, commit } = helpers;
  advance();

  while (true) {
    const charCode = getCharCode();
    if (isTerminateScan() || isNewLineTrivia(charCode)) {
      break;
    }
    advance(charCode);
  }


  return commit(SyntaxKind.LineCommentTrivia);
}
function scanBlockCommentTrivia(helpers: ScannerHelpers): SyntaxKind {
  const { isTerminateScan, appendTokenFlag, getCharCode, advance, commit } = helpers;

  advance(); // consume `/`
  advance(); // consume `*`
  while (true) {
    if (isTerminateScan()) {
      appendTokenFlag(TokenFlags.Unterminated);
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
function scanIdentifier(helpers: ScannerHelpers): SyntaxKind | undefined {
  const { getCharCode, getRuntimeTarget, advance } = helpers;
  const runtimeTarget = getRuntimeTarget();

  // AutoHotkey v1: https://www.autohotkey.com/docs/v1/Concepts.htm#names
  // AutoHotkey v2: https://www.autohotkey.com/docs/v2/Concepts.htm#names
  const charCode = getCharCode();
  if (!isIdentifierStart(charCode, runtimeTarget)) {
    return undefined;
  }
  advance(charCode);
  return scanIdentifierPart(helpers);
}
function scanIdentifierPart(helpers: ScannerHelpers): SyntaxKind | undefined {
  const { getCharCode, getRuntimeTarget, getTokenValue, advance, commit } = helpers;
  const runtimeTarget = getRuntimeTarget();

  const maxIdentifierCount = 253 - 1;
  for (let i = maxIdentifierCount; 0 < i; i--) {
    const charCode = getCharCode();
    if (!isIdentifierPart(charCode, runtimeTarget)) {
      break;
    }

    advance(charCode);
  }

  commit();
  switch (getTokenValue().toLowerCase()) {
    // reserved words
    case 'as': return RuntimeTarget.v2 <= runtimeTarget ? SyntaxKind.AsKeyword : SyntaxKind.Identifier;
    case 'and': return SyntaxKind.AndKeyword;
    case 'contains': return SyntaxKind.ContainsKeyword;
    case 'false': return SyntaxKind.FalseKeyword;
    case 'in': return SyntaxKind.InKeyword;
    case 'is': return SyntaxKind.IsKeyword;
    case 'isset': return RuntimeTarget.v2 <= runtimeTarget ? SyntaxKind.IsSetKeyword : SyntaxKind.Identifier;
    case 'not': return SyntaxKind.NotKeyword;
    case 'or': return SyntaxKind.OrKeyword;
    case 'super': return SyntaxKind.SuperKeyword;
    case 'true': return SyntaxKind.TrueKeyword;
    case 'unset': return SyntaxKind.UnsetKeyword;
    // keywords
    case 'break': return SyntaxKind.BreakKeyword;
    case 'case': return SyntaxKind.CaseKeyword;
    case 'catch': return SyntaxKind.CatchKeyword;
    case 'class': return SyntaxKind.ClassKeyword;
    case 'extends': return SyntaxKind.ExtendsKeyword;
    case 'continue': return SyntaxKind.ContinueKeyword;
    case 'else': return SyntaxKind.ElseKeyword;
    case 'finally': return SyntaxKind.FinallyKeyword;
    case 'for': return SyntaxKind.ForKeyword;
    case 'get': return SyntaxKind.GetKeyword;
    case 'global': return SyntaxKind.GlobalKeyword;
    case 'goto': return SyntaxKind.GotoKeyword;
    case 'if': return SyntaxKind.IfKeyword;
    case 'local': return SyntaxKind.LocalKeyword;
    case 'loop': return SyntaxKind.LoopKeyword;
    case 'return': return SyntaxKind.ReturnKeyword;
    case 'set': return SyntaxKind.SetKeyword;
    case 'static': return SyntaxKind.StaticKeyword;
    case 'switch': return SyntaxKind.SwitchKeyword;
    case 'throw': return SyntaxKind.ThrowKeyword;
    case 'try': return SyntaxKind.TryKeyword;
    case 'until': return SyntaxKind.UntilKeyword;
    case 'while': return SyntaxKind.WhileKeyword;
    default: break;
  }
  return SyntaxKind.Identifier;
}
function scanStringLiteral(helpers: ScannerHelpers): SyntaxKind {
  const { isTerminateScan, appendTokenFlag, advance, getCharCode, getRuntimeTarget, commit } = helpers;
  const runtimeTarget = getRuntimeTarget();

  // v1: https://www.autohotkey.com/docs/v1/Language.htm#strings
  // v2: https://www.autohotkey.com/docs/v2/Language.htm#strings
  const quote = getCharCode();
  advance(quote);

  while (true) {
    const current = getCharCode();
    if (isTerminateScan() || isNewLineTrivia(current)) {
      appendTokenFlag(TokenFlags.Unterminated);
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

  if (quote === CharacterCodes.SingleQuotation && getRuntimeTarget() === RuntimeTarget.v1) {
    appendTokenFlag(TokenFlags.UnSupported);
  }
  return commit(SyntaxKind.StringLiteral);
}
function scanNumberLiteral(helpers: ScannerHelpers): SyntaxKind {
  const { isTerminateScan, hasTokenFlag, appendTokenFlag, getCharCode, getRuntimeTarget, advance, expect, commit } = helpers;
  const runtimeTarget = getRuntimeTarget();

  // v1: https://www.autohotkey.com/docs/v1/Concepts.htm#numbers
  // v2: https://www.autohotkey.com/docs/v2/Concepts.htm#numbers
  const charCode = getCharCode();
  if (charCode === CharacterCodes._0) {
    advance();

    const current = getCharCode();
    if (current === CharacterCodes._x || current === CharacterCodes._X) {
      advance();

      scanHex();
      appendTokenFlag(TokenFlags.HexNumber);
      return commit(SyntaxKind.NumberLiteral);
    }
    appendTokenFlag(TokenFlags.ContainsLeadingZero);
  }

  while (true) {
    if (isTerminateScan()) {
      break;
    }

    const current = getCharCode();
    if (isNumber(current)) {
      advance();
      continue;
    }
    if (current === CharacterCodes.Dot) {
      advance();
      scanDecimal();
      appendTokenFlag(TokenFlags.FloatNumber);
      break;
    }
    if (isIdentifierPart(current, runtimeTarget)) {
      appendTokenFlag(TokenFlags.ContainsLeadingDigit);
      return scanIdentifierPart(helpers)!;
    }

    break;
  }

  if (hasTokenFlag(TokenFlags.FloatNumber)) {
    if (expect(CharacterCodes._e) || expect(CharacterCodes._E)) {
      advance();

      if (expect(CharacterCodes.Plus) || expect(CharacterCodes.Minus)) {
        advance();
      }

      scanDecimal();
      appendTokenFlag(TokenFlags.ScientificNotationNumber);
      return SyntaxKind.NumberLiteral;
    }
  }
  return commit(SyntaxKind.NumberLiteral);

  function scanDecimal(): void {
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
    commit();
  }
  function scanHex(): void {
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
    commit();
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
export const isWhiteSpaceTrivia = (charCode: number): boolean => {
  return isHorizSpaceTrivia(charCode) || isNewLineTrivia(charCode);
};
export const isNumber = (charCode: number): boolean => {
  return CharacterCodes._0 <= charCode && charCode <= CharacterCodes._9;
};
export const isLowerAlphabet = (charCode: number): boolean => {
  return CharacterCodes._a <= charCode && charCode <= CharacterCodes._z;
};
export const isUpperAlphabet = (charCode: number): boolean => {
  return CharacterCodes._A <= charCode && charCode <= CharacterCodes._Z;
};
export const isAlphabet = (charCode: number): boolean => {
  return isLowerAlphabet(charCode) || isUpperAlphabet(charCode);
};
export const isLowerAlphaNumber = (charCode: number): boolean => {
  return isLowerAlphabet(charCode) || isNumber(charCode);
};
export const isUpperAlphaNumber = (charCode: number): boolean => {
  return isUpperAlphabet(charCode) || isNumber(charCode);
};
export const isAlphaNumber = (charCode: number): boolean => {
  return isLowerAlphaNumber(charCode) || isUpperAlphaNumber(charCode);
};
export const isUnicodeIdentifier = (charCode: number): boolean => {
  return CharacterCodes.LastAsciiChar < charCode;
};
export const isExtraIdentifierName = (charCode: number, runtimeTarget: RuntimeTarget): boolean => {
  switch (charCode) {
    case CharacterCodes.AtMark:
    case CharacterCodes.Dollar:
    case CharacterCodes.Hash: {
      if (runtimeTarget === RuntimeTarget.v2) {
        return false;
      }
      return true;
    }
    case CharacterCodes.Underscore: return true;
    default: break;
  }
  return false;
};
export const isIdentifierStart = (charCode: number, runtimeTarget: RuntimeTarget): boolean => {
  return isAlphabet(charCode) || isUnicodeIdentifier(charCode) || isExtraIdentifierName(charCode, runtimeTarget);
};
export const isIdentifierPart = (charCode: number, runtimeTarget: RuntimeTarget): boolean => {
  return isAlphaNumber(charCode) || isUnicodeIdentifier(charCode) || isExtraIdentifierName(charCode, runtimeTarget);
};
export const isFullWidthChar = (charCode: number): boolean => {
  return CharacterCodes.FullWidthStart <= charCode;
};
