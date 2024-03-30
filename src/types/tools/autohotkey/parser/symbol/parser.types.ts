import { TimeoutError } from '../../../../../tools/promise';
import { SyntaxKind } from '../common.types';

export interface ParserContext {
  index: number;
  dependencyFiles: string[];
}
export interface Parser {
  parse: (rootFilePath: string) => Promise<ProgramSymbol | TimeoutError>;
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
  | 'setter';
export type Modifier = 'static';
export interface SymbolMatcherMap {
  include: (sourceText: string) => IncludeMatcherResult | undefined;
  function: (sourceText: string) => FunctionMatcherResult | undefined;
  class: (sourceText: string) => ClassMatcherResult | undefined;
  // field: () => { startIndex: number; name: string };
  method: (sourceText: string) => MethodMatcherResult | undefined;
  property: (sourceText: string) => PropertyMatcherResult | undefined;
  getter: (sourceText: string) => AccesorMatcherResult | undefined;
  setter: (sourceText: string) => AccesorMatcherResult | undefined;
}
export type MatcherResult =
  | IncludeMatcherResult
  | FunctionMatcherResult
  | ClassMatcherResult
  | MethodMatcherResult
  | PropertyMatcherResult
  | AccesorMatcherResult;
export interface MatcherResultBase {
  kind: SyntaxKind;
  startIndex: number;
}
export interface IncludeMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.IncludeStatement;
  type: 'library' | 'file' | 'directory';
  path: string;
}
export interface FunctionMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.FunctionDeclaration;
  endIndex: number;
  name: string;
}
export interface ClassMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.ClassDeclaration;
  startIndex: number;
  endIndex: number;
  name: string;
  extends: string;
}
export interface MethodMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.MethodDeclaration;
  endIndex: number;
  modifier?: Modifier;
  name: string;
}
export interface PropertyMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.PropertyDeclaration;
  endIndex: number;
  modifier?: Modifier;
  name: string;
}
export interface AccesorMatcherResult extends MatcherResultBase {
  kind: SyntaxKind.GetterDeclaration | SyntaxKind.SetterDeclaration;
  endIndex: number;
}

export type SymbolTable = Record<string, any>;
export type SymbolSyntaxKind =
  | SyntaxKind.Skip
  | SyntaxKind.Program
  | SyntaxKind.SourceFile
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
  | IncludeSymbolNode
  | DebugDirectiveSymbol;

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
