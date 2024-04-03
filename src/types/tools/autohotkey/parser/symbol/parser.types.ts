import { SyntaxKind } from '../common.types';

export interface ParserContext {
  index: number;
  dependencyFiles: string[];
}
export interface Parser {
  parse: (rootFilePath: string) => Promise<ProgramSymbol>;
}
export type SourceFileResolver = (uri: string) => Promise<string>;
export type SymbolName =
  | 'directive'
  | 'include'
  | 'function'
  | 'class'
  // | 'field'
  | 'method'
  | 'property'
  | 'getter'
  | 'setter'
  | 'endBlock';
export type Modifier = 'static';
export interface SymbolMatcherMap {
  directive: (sourceText: string, index: number) => DebugDirectiveMatcherResult | undefined;
  include: (sourceText: string, index: number) => IncludeMatcherResult | undefined;
  function: (sourceText: string, index: number) => FunctionMatcherResult | undefined;
  class: (sourceText: string, index: number) => ClassMatcherResult | undefined;
  // field: () => { startIndex: number; name: string };
  method: (sourceText: string, index: number) => MethodMatcherResult | undefined;
  property: (sourceText: string, index: number) => PropertyMatcherResult | undefined;
  getter: (sourceText: string, index: number) => GetterMatcherResult | undefined;
  setter: (sourceText: string, index: number) => SetterMatcherResult | undefined;
  endBlock: (sourceText: string, index: number) => EndBlockMatcherResult | undefined;
}
export type MatcherResult =
  | DebugDirectiveMatcherResult
  | IncludeMatcherResult
  | FunctionMatcherResult
  | ClassMatcherResult
  | MethodMatcherResult
  | PropertyMatcherResult
  | GetterMatcherResult
  | SetterMatcherResult
  | EndBlockMatcherResult;
export interface MatcherResultBase {
  kind: SyntaxKind;
  startIndex: number;
}
export interface DebugDirectiveMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.DebugDirectiveTrivia;
  action?: DebugDirectiveAction;
  argsText?: string;
  endIndex: number;
}
export interface IncludeMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.IncludeStatement;
  isAgain: boolean;
  isOptional: boolean;
  path: string;
  endIndex: number;
}
export interface FunctionMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.FunctionDeclaration;
  name: string;
  blockStartIndex: number;
}
export interface ClassMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.ClassDeclaration;
  startIndex: number;
  blockStartIndex: number;
  name: string;
  superClassName?: string;
}
export interface MethodMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.MethodDeclaration;
  modifier?: Modifier;
  name: string;
  blockStartIndex: number;
}
export interface PropertyMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.PropertyDeclaration;
  modifier?: Modifier;
  name: string;
  blockStartIndex: number;
}
export interface GetterMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.GetterDeclaration;
  blockStartIndex: number;
}
export interface SetterMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.SetterDeclaration;
  blockStartIndex: number;
}
export interface EndBlockMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.CloseBraceToken;
}

export type SymbolTable = Record<string, any>;
export type SymbolSyntaxKind =
  | SyntaxKind.Skip
  | SyntaxKind.Program
  | SyntaxKind.SourceFile
  | SyntaxKind.Block
  | SyntaxKind.IncludeStatement
  | SyntaxKind.VariableDeclaration
  | SyntaxKind.FunctionDeclaration
  | SyntaxKind.ClassDeclaration
  | SyntaxKind.FieldDeclaration
  | SyntaxKind.MethodDeclaration
  | SyntaxKind.PropertyDeclaration
  | SyntaxKind.GetterDeclaration
  | SyntaxKind.SetterDeclaration
  | SyntaxKind.DebugDirectiveTrivia;
export interface SymbolPosition {
  line: number;
  character: number;
}
export interface SymbolRange {
  start: SymbolPosition;
  end: SymbolPosition;
}
export type SymbolNode =
  | SourceFileSymbol
  | BlockSymbol
  | DebugDirectiveSymbol
  | IncludeSymbol
  | FunctionSymbol
  | ClassSymbol
  | MethodSymbol
  | PropertySymbol
  | GetterSymbol
  | SetterSymbol;
export interface SymbolNodeBase {
  kind: SymbolSyntaxKind;
  startPosition: number;
  endPosition: number;
}

export interface SkipNode extends SymbolNodeBase {
  kind: SyntaxKind.Skip;
}

export interface IncludeSymbol extends SymbolNodeBase {
  kind: SyntaxKind.IncludeStatement;
  path: string;
  symbol: SourceFileSymbol;
}
export interface ProgramSymbol {
  kind: SymbolSyntaxKind;
  dependencyFiles: string[];
  symbol: SourceFileSymbol;
}
export interface SourceFileSymbol extends SymbolNodeBase {
  kind: SyntaxKind.SourceFile;
  text: string;
  parent?: SourceFileSymbol;
  symbols: SymbolNode[];
}
export enum DebugDirectiveAction {
  Breakpoint = 'Breakpoint',
  Output = 'Output',
  ClearConsole = 'ClearConsole',
}
export interface DebugDirectiveSymbol extends SymbolNodeBase {
  kind: SyntaxKind.DebugDirectiveTrivia;
  action?: DebugDirectiveAction;
  argsText?: string;
}
export interface BlockSymbol extends SymbolNodeBase {
  kind: SyntaxKind.Block;
  symbols: SymbolNode[];
}
export interface FunctionSymbol extends SymbolNodeBase {
  kind: SyntaxKind.FunctionDeclaration;
  name: string;
  block: BlockSymbol;
}
export interface ClassSymbol extends SymbolNodeBase {
  kind: SyntaxKind.ClassDeclaration;
  name: string;
  extends?: string;
  block: BlockSymbol;
}
export interface MethodSymbol extends SymbolNodeBase {
  kind: SyntaxKind.MethodDeclaration;
  modifier?: Modifier;
  name: string;
  block: BlockSymbol;
}
export interface PropertySymbol extends SymbolNodeBase {
  kind: SyntaxKind.PropertyDeclaration;
  name: string;
  block: BlockSymbol;
}
export interface GetterSymbol extends SymbolNodeBase {
  kind: SyntaxKind.GetterDeclaration;
  block: BlockSymbol;
}
export interface SetterSymbol extends SymbolNodeBase {
  kind: SyntaxKind.SetterDeclaration;
  block: BlockSymbol;
}
