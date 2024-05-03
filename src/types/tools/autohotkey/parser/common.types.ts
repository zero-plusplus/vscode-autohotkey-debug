/* eslint-disable no-bitwise, no-multi-spaces, @typescript-eslint/prefer-literal-enum-member */
// #region enum
export const enum RuntimeTarget {
  Legacy = 0,
  v1 = 1000,
  v2 = 2000,
  v2_1 = 2100,
}
export type Parser = { parse: (input: string, startRule?: string) => SyntaxNode };

export enum SyntaxKind {
  Unknown = 'Unknown',
  Skip = 'Skip',
  Bom = 'Bom',
  SourceFile = 'SourceFile',
  Program = 'Program',
  EndOfFileToken = 'EndOfFileToken',

  // #region trivia
  LineCommentTrivia = 'LineCommentTrivia',
  BlockCommentTrivia = 'BlockCommentTrivia',
  CommentDirectiveTrivia = 'CommentDirectiveTrivia',
  NewLineTrivia = 'NewLineTrivia',
  HorizSpaceTrivia = 'HorizSpaceTrivia',
  DebugDirectiveTrivia = 'DebugDirectiveTrivia',
  // #endregion trivia

  // #region Statement
  Block = 'Block',
  IncludeStatement = 'IncludeStatement',
  VariableDeclaration = 'VariableDeclaration',
  VariableDeclarator = 'VariableDeclarator',
  FunctionDeclaration = 'FunctionDeclaration',
  ClassDeclaration = 'ClassDeclaration',
  MethodDeclaration = 'MethodDeclaration',
  FieldDeclaration = 'FieldDeclaration',
  PropertyDeclaration = 'PropertyDeclaration',
  GetterDeclaration = 'GetterDeclaration',
  SetterDeclaration = 'SetterDeclaration',
  // #endregion Statement

  // #region expression
  Identifier = 'Identifier',
  StringLiteral = 'StringLiteral',
  NumberLiteral = 'NumberLiteral',
  BooleanLiteral = 'BooleanLiteral',
  RawString = 'RawString',
  ObjectLiteral = 'ObjectLiteral',
  ArrayLiteral = 'ArrayLiteral',
  LegacyExpression = 'LegacyExpression',
  DereferenceExpression = 'DereferenceExpression',
  NameSubstitutionExpression = 'NameSubstitutionExpression',
  BinaryExpression = 'BinaryExpression',
  AssignExpression = 'AssignExpression',
  CallExpression = 'CallExpression',
  PropertyAccessExpression = 'PropertyAccessExpression',
  ElementAccessExpression = 'ElementAccessExpression',
  DereferencePropertyAccessExpression = 'DereferencePropertyAccessExpression',
  UnaryExpression = 'UnaryExpression',
  PrefixUnaryExpression = 'PrefixUnaryExpression',
  PostfixUnaryExpression = 'PostfixUnaryExpression',
  TernaryExpression = 'TernaryExpression',
  SequenceExpression = 'SequenceExpression',
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
  NewKeyword = 'NewKeyword',
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
  ImplicitConcatenateToken = 'ImplicitConcatenateToken',
  Custom = 'Custom',
}

export const enum TokenFlags {
  None = 0,
  Unsupported =               1 << 0,
  Removed =                   1 << 1,
  Unterminated =              1 << 2,
  HexNumber =                 1 << 3,
  FloatNumber =               1 << 4,
  ScientificNotationNumber =  1 << 5,
  ContainsLeadingZero =       1 << 6,
  ContainsLeadingDigit =      1 << 7,
  ContainsInvalidEscape =     1 << 8,
}
// #region enum

// #region green node
export interface GreenSyntax {
  kind: SyntaxKind;
}
export interface GreenToken extends GreenSyntax {
  text: string;
  flags: TokenFlags;
}
export interface GreenNode extends GreenSyntax {
  width: number;
  children: GreenElement[];
}
export type GreenElement = GreenNode | GreenToken;
// #endregion green node

export interface TextRange {
  startPosition: number;
  endPosition: number;
}
export interface SyntaxNodeBase extends TextRange {
  kind: SyntaxKind;
  text: string;
}
export type SyntaxNode =
  | Expression
  | CustomNode;
export type SyntaxElement = Token<SyntaxKind> | SyntaxNode;

// #region root
export interface SourceFile extends SyntaxNodeBase {
  kind: SyntaxKind.SourceFile;
  statements: Array<Bom | Statement>;
}
// #endregion root
// #region token
export interface Token<Kind extends SyntaxKind> extends SyntaxNodeBase {
  kind: Kind;
}
export type Bom = Token<SyntaxKind.Bom>;
export type OperatorToken =
  | Token<SyntaxKind.ColonEqualsToken>;
export type UnaryOperatorToken =
  | Token<SyntaxKind.PlusToken>
  | Token<SyntaxKind.MinusToken>
  | Token<SyntaxKind.ExclamationToken>
  | Token<SyntaxKind.TildeToken>;
export type PrefixUnaryOperatorToken =
  | Token<SyntaxKind.PlusPlusToken>
  | Token<SyntaxKind.MinusMinusToken>;
export type PostfixUnaryOperatorToken =
  | Token<SyntaxKind.PlusPlusToken>
  | Token<SyntaxKind.MinusMinusToken>;
// #endregion token

// #region statement
export type Statement =
  | Block
  | Declaration
  | CustomNode;

export interface Block extends SyntaxNodeBase {
  kind: SyntaxKind.Block;
}
// #endregion statement
// #region declaration
export type Declaration =
  | VariableDeclaration
  | FunctionDeclaration
  | CustomNode;

export type Identifier = Token<SyntaxKind.Identifier>;
export type Modifier = Token<SyntaxKind.GlobalKeyword> | Token<SyntaxKind.LocalKeyword> | Token<SyntaxKind.StaticKeyword>;
export interface NameSubstitutionExpression extends SyntaxNodeBase {
  kind: SyntaxKind.NameSubstitutionExpression;
  expressions: Expression[];
}
export interface DereferenceExpression extends SyntaxNodeBase {
  kind: SyntaxKind.DereferenceExpression;
  expression: Expression;
}
export interface VariableDeclaration extends SyntaxNodeBase {
  kind: SyntaxKind.VariableDeclaration;
  modifier?: Modifier;
  name: Identifier;
  initializer: SyntaxElement;
}
export interface FunctionDeclaration extends SyntaxNodeBase {
  kind: SyntaxKind.FunctionDeclaration;
  name: Identifier;
  block: Block;
}
// #endregion declaration

// #region expression
export type Expression =
  | Identifier
  | StringLiteral
  | NumberLiteral
  | BooleanLiteral
  | NameSubstitutionExpression
  | DereferenceExpression
  | UnaryExpression
  | PrefixUnaryExpression
  | PostfixUnaryExpression
  | BinaryExpression
  | SequenceExpression
  | PropertyAccessExpression
  | ElementAccessExpression
  | CustomNode;
export interface Primitive extends SyntaxNodeBase {
  kind: SyntaxKind;
  value: string;
}
export interface StringLiteral extends Primitive {
  kind: SyntaxKind.StringLiteral;
}
export interface NumberLiteral extends Primitive {
  kind: SyntaxKind.NumberLiteral;
}
export interface BooleanLiteral extends Primitive {
  kind: SyntaxKind.BooleanLiteral;
}
export interface UnaryExpression extends SyntaxNodeBase {
  kind: SyntaxKind.UnaryExpression;
  operator: UnaryOperatorToken;
  operand: Expression;
}
export interface PrefixUnaryExpression extends SyntaxNodeBase {
  kind: SyntaxKind.PrefixUnaryExpression;
  operator: PrefixUnaryOperatorToken;
  operand: Expression;
}
export interface PostfixUnaryExpression extends SyntaxNodeBase {
  kind: SyntaxKind.PostfixUnaryExpression;
  operator: PostfixUnaryOperatorToken;
  operand: Expression;
}
export interface BinaryExpression extends SyntaxNodeBase {
  kind: SyntaxKind.BinaryExpression;
  left: Expression;
  operator: OperatorToken;
  right: Expression;
}
export interface SequenceExpression extends SyntaxNodeBase {
  kind: SyntaxKind.SequenceExpression;
  expressions: Expression[];
}
export interface PropertyAccessExpression extends SyntaxNodeBase {
  kind: SyntaxKind.PropertyAccessExpression;
  object: Expression;
  property: Identifier | DereferenceExpression | NameSubstitutionExpression;
}
export interface ElementAccessExpression extends SyntaxNodeBase {
  kind: SyntaxKind.ElementAccessExpression;
  object: Expression;
  elements: Expression[];
}
// #endregion expression

export interface CustomNode extends TextRange, Record<string, any> {
  kind: SyntaxKind.Custom;
}
