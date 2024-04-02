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
  include: (sourceText: string, index: number) => IncludeMatcherResult | undefined;
  function: (sourceText: string, index: number) => FunctionMatcherResult | undefined;
  class: (sourceText: string, index: number) => ClassMatcherResult | undefined;
  // field: () => { startIndex: number; name: string };
  method: (sourceText: string, index: number) => MethodMatcherResult | undefined;
  property: (sourceText: string, index: number) => PropertyMatcherResult | undefined;
  getter: (sourceText: string, index: number) => AccesorMatcherResult | undefined;
  setter: (sourceText: string, index: number) => AccesorMatcherResult | undefined;
  endBlock: (sourceText: string, index: number) => EndBlockMatcherResult | undefined;
}
export type MatcherResult =
  | IncludeMatcherResult
  | FunctionMatcherResult
  | ClassMatcherResult
  | MethodMatcherResult
  | PropertyMatcherResult
  | AccesorMatcherResult
  | EndBlockMatcherResult;
export interface MatcherResultBase {
  kind: SyntaxKind;
  startIndex: number;
}
export interface IncludeMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.IncludeStatement;
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
  superClassName: string;
}
export interface MethodMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.MethodDeclaration;
  modifier?: Modifier;
  name: string;
}
export interface PropertyMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.PropertyDeclaration;
  modifier?: Modifier;
  name: string;
}
export interface AccesorMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.GetterDeclaration | SyntaxKind.SetterDeclaration;
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
  | IncludeSymbolNode
  | FunctionSymbol;

export interface SymbolNodeBase {
  kind: SymbolSyntaxKind;
  startPosition: number;
  endPosition: number;
}

export interface SkipNode extends SymbolNodeBase {
  kind: SyntaxKind.Skip;
}

export interface IncludeSymbolNode extends SymbolNodeBase {
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
  action: DebugDirectiveAction;
  condition: string;
  logMessage: string;
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
