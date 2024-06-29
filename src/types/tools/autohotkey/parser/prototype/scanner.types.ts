import { GreenToken, RuntimeTarget, SyntaxKind, TokenFlags } from '../common.types';

export const enum CharacterCodes {
  Null = 0,

  Tab = 0x0009,                 // \t
  LineFeed = 0x000A,            // \n
  CarriageReturn = 0x000D,      // \r
  Space = 0x0020,               // ` `

  Exclamation = 0x0021,         // !
  DoubleQuotation = 0x0022,     // "
  Hash = 0x0023,                // #
  Dollar = 0x0024,              // $
  Percent = 0x0025,             // %
  Ampersand = 0x0026,           // &
  SingleQuotation = 0x0027,     // '
  OpenParen = 0x0028,           // (
  CloseParen = 0x0029,          // )
  Asterisk = 0x002A,            // *
  Plus = 0x002B,                // +
  Comma = 0x002C,               // ,
  Minus = 0x002D,               // -
  Dot = 0x002E,                 // .
  Slash = 0x002F,               // /

  _0 = 0x0030,                  // 0
  _1 = 0x0031,                  // 1
  _2 = 0x0032,                  // 2
  _3 = 0x0033,                  // 3
  _4 = 0x0034,                  // 4
  _5 = 0x0035,                  // 5
  _6 = 0x0036,                  // 6
  _7 = 0x0037,                  // 7
  _8 = 0x0038,                  // 8
  _9 = 0x0039,                  // 9
  Colon = 0x003A,               // :
  SemiColon = 0x003B,           // ;
  LessThan = 0x003C,            // <
  Equals = 0x003D,              // =
  GreaterThan = 0x003E,         // >
  Question = 0x003F,            // ?

  AtMark = 0x0040,              // @
  _A = 0x0041,                  // A
  _B = 0x0042,                  // B
  _C = 0x0043,                  // C
  _D = 0x0044,                  // D
  _E = 0x0045,                  // E
  _F = 0x0046,                  // F
  _G = 0x0047,                  // G
  _H = 0x0048,                  // H
  _I = 0x0049,                  // I
  _J = 0x004A,                  // J
  _K = 0x004B,                  // K
  _L = 0x004C,                  // L
  _M = 0x004D,                  // M
  _N = 0x004E,                  // N
  _O = 0x004F,                  // O

  _P = 0x0050,                  // P
  _Q = 0x0051,                  // Q
  _R = 0x0052,                  // R
  _S = 0x0053,                  // S
  _T = 0x0054,                  // T
  _U = 0x0055,                  // U
  _V = 0x0056,                  // V
  _W = 0x0057,                  // W
  _X = 0x0058,                  // X
  _Y = 0x0059,                  // Y
  _Z = 0x005A,                  // Z
  OpenBracket = 0x005B,         // [
  BackSlash = 0x005C,           // \
  CloseBracket = 0x005D,        // ]
  Caret = 0x005E,               // ^
  Underscore = 0x005F,          // _

  Backtick = 0x0060,            // `
  _a = 0x0061,                  // a
  _b = 0x0062,                  // b
  _c = 0x0063,                  // c
  _d = 0x0064,                  // d
  _e = 0x0065,                  // e
  _f = 0x0066,                  // f
  _g = 0x0067,                  // g
  _h = 0x0068,                  // h
  _i = 0x0069,                  // i
  _j = 0x006A,                  // j
  _k = 0x006B,                  // k
  _l = 0x006C,                  // l
  _m = 0x006D,                  // m
  _n = 0x006E,                  // n
  _o = 0x006F,                  // o

  _p = 0x0070,                  // p
  _q = 0x0071,                  // q
  _r = 0x0072,                  // r
  _s = 0x0073,                  // s
  _t = 0x0074,                  // t
  _u = 0x0075,                  // u
  _v = 0x0076,                  // v
  _w = 0x0077,                  // w
  _x = 0x0078,                  // x
  _y = 0x0079,                  // y
  _z = 0x007A,                  // z
  OpenBrace = 0x007B,           // {
  Bar = 0x007C,                 // |
  CloseBrace = 0x007D,          // }
  Tilde = 0x007E,               // ~
  Bom = 0xFEFF,                 // UTF-8 BOM

  LastAsciiChar = 0x007f,
  NonAsciiCharStart = 0x0080,
  NonAsciiCharEnd = 0x10FFFF,
  FullWidthStart = 0x10000,
}


export type ErrorCallback = (message: string) => void;
export interface ScannerOptions {
  start?: number;
  length?: number;
}

export type TokenResolver = (helpers: ScannerHelpers) => GreenToken;
export type TokenResolverLike = SyntaxKind | TokenResolver | TokenResolverMap | [ RegExp, SyntaxKind ] | undefined;
export type TokenResolverMap = {
  [key: string]: TokenResolverLike;
};
export interface ScannerHelpers {
  runtimeTarget: RuntimeTarget;
  hasTokenFlag: (flag: TokenFlags) => boolean;
  appendTokenFlag: (...flags: TokenFlags[]) => void;
  isTerminate: () => boolean;
  getCharCode: () => number;
  getCharCodeByOffset: (offset: number) => number;
  advance: (charCode?: CharacterCodes) => void;
  advanceByRegExp: (regexp: RegExp) => number;
  expect: (expectCharCode: CharacterCodes, initialOffset?: number) => boolean;
  expectNext: (expectCharCode: CharacterCodes) => boolean;
  commit: (syntaxKind: SyntaxKind) => GreenToken;
}
