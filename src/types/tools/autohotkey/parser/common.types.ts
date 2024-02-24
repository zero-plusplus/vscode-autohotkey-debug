/* eslint-disable no-bitwise, no-multi-spaces, @typescript-eslint/prefer-literal-enum-member */
// #region data
export const enum RuntimeTarget {
  Legacy = 0,
  v1 = 1000,
  v2 = 2000,
  v2_1 = 2100,
}

export enum SyntaxKind {
  Unknown = 'Unknown',
  Bom = 'Bom',
  SourceFile = 'SourceFile',
  EndOfFileToken = 'EndOfFileToken',

  // #region trivia
  LineCommentTrivia = 'LineCommentTrivia',
  BlockCommentTrivia = 'BlockCommentTrivia',
  CommentDirectiveTrivia = 'CommentDirectiveTrivia',
  NewLineTrivia = 'NewLineTrivia',
  HorizSpaceTrivia = 'HorizSpaceTrivia',
  // #endregion trivia
  // #region expression
  Identifier = 'Identifier',
  StringLiteral = 'StringLiteral',
  NumberLiteral = 'NumberLiteral',
  RawString = 'RawString',
  LegacyExpression = 'LegacyExpression',
  DereferenceExpression = 'DereferenceExpression',
  NameSubstitutionExpression = 'NameSubstitutionExpression',
  PrefixUnaryExpression = 'PrefixUnaryExpression',
  PostfixUnaryExpression = 'PostfixUnaryExpression',
  BinaryExpression = 'BinaryExpression',
  // #endregion expression
  // #region reserved words
  AsKeyword = 'AsKeyword',
  AndKeyword = 'AndKeyword',
  ContainsKeyword = 'ContainsKeyword',
  FalseKeyword = 'FalseKeyword',
  InKeyword = 'InKeyword',
  IsKeyword = 'IsKeyword',
  IsSetKeyword = 'IsSetKeyword',
  NotKeyword = 'NotKeyword',
  OrKeyword = 'OrKeyword',
  SuperKeyword = 'SuperKeyword',
  TrueKeyword = 'TrueKeyword',
  UnsetKeyword = 'UnsetKeyword',

  // keywords
  BreakKeyword = 'BreakKeyword',
  CaseKeyword = 'CaseKeyword',
  CatchKeyword = 'CatchKeyword',
  ClassKeyword = 'ClassKeyword',
  ContinueKeyword = 'ContinueKeyword',
  ElseKeyword = 'ElseKeyword',
  ExtendsKeyword = 'ExtendsKeyword',
  FinallyKeyword = 'FinallyKeyword',
  ForKeyword = 'ForKeyword',
  GetKeyword = 'GetKeyword',
  GlobalKeyword = 'GlobalKeyword',
  GotoKeyword = 'GotoKeyword',
  IfKeyword = 'IfKeyword',
  LocalKeyword = 'LocalKeyword',
  LoopKeyword = 'LoopKeyword',
  ReturnKeyword = 'ReturnKeyword',
  SetKeyword = 'SetKeyword',
  StaticKeyword = 'StaticKeyword',
  SwitchKeyword = 'SwitchKeyword',
  ThrowKeyword = 'ThrowKeyword',
  TryKeyword = 'TryKeyword',
  UntilKeyword = 'UntilKeyword',
  WhileKeyword = 'WhileKeyword',
  // #endregion reserved words
  // #region token
  PlusToken = 'PlusToken',
  PlusPlusToken = 'PlusPlusToken',
  PlusEqualsToken = 'PlusEqualsToken',
  MinusToken = 'MinusToken',
  MinusMinusToken = 'MinusMinusToken',
  MinusEqualsToken = 'MinusEqualsToken',
  AsteriskToken = 'AsteriskToken',
  AsteriskAsteriskToken = 'AsteriskAsteriskToken',
  AsteriskEqualsToken = 'AsteriskEqualsToken',
  SlashToken = 'SlashToken',
  SlashSlashToken = 'SlashSlashToken',
  SlashEqualsToken = 'SlashEqualsToken',
  SlashSlashEqualsToken = 'SlashSlashEqualsToken',
  ColonToken = 'ColonToken',
  ColonEqualsToken = 'ColonEqualsToken',
  CommaToken = 'CommaToken',
  EqualsToken = 'EqualsToken',
  EqualsEqualsToken = 'EqualsEqualsToken',
  EqualsGreaterThanToken = 'EqualsGreaterThanToken',
  DotToken = 'DotToken',
  DotEqualsToken = 'DotEqualsToken',
  BarToken = 'BarToken',
  BarBarToken = 'BarBarToken',
  BarEqualsToken = 'BarEqualsToken',
  AmpersandToken = 'AmpersandToken',
  AmpersandAmpersandToken = 'AmpersandAmpersandToken',
  AmpersandEqualToken = 'AmpersandEqualToken',
  CaretToken = 'CaretToken',
  CaretEqualsToken = 'CaretEqualsToken',
  LessThanToken = 'LessThanToken',
  LessThanEqualsToken = 'LessThanEqualsToken',
  LessThanLessThanToken = 'LessThanLessThanToken',
  LessThanLessThanEqualsToken = 'LessThanLessThanEqualsToken',
  LessThanGreaterThanToken = 'LessThanGreaterThanToken',
  GreaterThanToken = 'GreaterThanToken',
  GreaterThanGreaterThanToken = 'GreaterThanGreaterThanToken',
  GreaterThanGreaterThanEqualsToken = 'GreaterThanGreaterThanEqualsToken',
  GreaterThanGreaterThanGreaterThanToken = 'GreaterThanGreaterThanGreaterThanToken',
  GreaterThanGreaterThanGreaterThanEqualsToken = 'GreaterThanGreaterThanGreaterThanEqualsToken',
  GreaterThanEqualsToken = 'GreaterThanEqualsToken',
  TildeToken = 'TildeToken',
  TildeEqualsToken = 'TildeEqualsToken',
  ExclamationToken = 'ExclamationToken',
  ExclamationEqualsToken = 'ExclamationEqualsToken',
  ExclamationEqualsEqualsToken = 'ExclamationEqualsEqualsToken',
  PercentToken = 'PercentToken',
  SemiColonToken = 'SemiColonToken',
  SemiColonSemiColonToken = 'SemiColonSemiColonToken',
  QuestionToken = 'QuestionToken',
  QuestionDotToken = 'QuestionDotToken',
  QuestionQuestionToken = 'QuestionQuestionToken',
  QuestionQuestionEqualsToken = 'QuestionQuestionEqualsToken',
  OpenParenToken = 'OpenParenToken',
  OpenBracketToken = 'OpenBracketToken',
  OpenBraceToken = 'OpenBraceToken',
  CloseParenToken = 'CloseParenToken',
  CloseBracketToken = 'CloseBracketToken',
  CloseBraceToken = 'CloseBraceToken',
}
// #region enum

// #region green node
export interface Syntax {
  kind: SyntaxKind;
}
export interface GreenToken extends Syntax {
  text: string;
}
export interface GreenNode extends Syntax {
  width: number;
  children: GreenElement[];
}
export type GreenElement = GreenNode | GreenToken;
// #endregion green node

