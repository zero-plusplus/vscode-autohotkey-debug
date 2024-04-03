import * as path from 'path';
import * as fs from 'fs';
import { SyntaxKind } from '../../../../types/tools/autohotkey/parser/common.types';
import { BlockSymbol, ClassMatcherResult, ClassSymbol, DebugDirectiveMatcherResult, DebugDirectiveSymbol, FunctionMatcherResult, FunctionSymbol, GetterMatcherResult, GetterSymbol, IncludeMatcherResult, IncludeSymbol, MatcherResult, MethodMatcherResult, MethodSymbol, Parser, ParserContext, ProgramSymbol, PropertyMatcherResult, PropertySymbol, SetterMatcherResult, SetterSymbol, SourceFileResolver, SourceFileSymbol, SymbolMatcherMap, SymbolName, SymbolNode } from '../../../../types/tools/autohotkey/parser/symbol/parser.types';
import { AutoHotkeyVersion, ParsedAutoHotkeyVersion } from '../../../../types/tools/autohotkey/version/common.types';
import { parseAutoHotkeyVersion } from '../../version';
import { maskBlockComments, maskContinuationSection } from './utils';
import { PartialedAutoHotkeyEnvironments } from '../../../../types/tools/autohotkey/path/resolver.types';
import { createPathResolver } from '../../path/resolver';
import { fileExists } from '../../../predicate';

export const defaultFilePathResolver = async(filePath: string): Promise<string> => fs.promises.readFile(filePath, 'utf-8');
export const createParser = (rawVersion: AutoHotkeyVersion | ParsedAutoHotkeyVersion, resolver: SourceFileResolver = defaultFilePathResolver, timeout_ms?: number): Parser => {
  const version = typeof rawVersion === 'string' ? parseAutoHotkeyVersion(rawVersion) : rawVersion;

  const symbolMatcherMap = createSymbolMatcherMap(version);
  const globalSymbolNames: SymbolName[] = [ 'directive', 'include', 'function', 'class' ];
  const localSymbolNames: SymbolName[] = [ 'directive', 'include', 'function', 'class' ];
  const classSymbolNames: SymbolName[] = [ 'directive', 'include', 'class', 'method', 'property' ];
  const propertySymbolNames: SymbolName[] = [ 'directive', 'include', 'getter', 'setter' ];

  return {
    parse,
  };

  async function parse(rootFilePath: string, env?: PartialedAutoHotkeyEnvironments): Promise<ProgramSymbol> {
    const pathResolver = createPathResolver(version, env);
    const includeCache = new Map<string, SourceFileSymbol>();
    return parseProgramSymbol();

    async function parseProgramSymbol(): Promise<ProgramSymbol> {
      const context: ParserContext = {
        index: 0,
        dependencyFiles: [],
      };
      const sourceSymbol = await parseSourceFile(context, rootFilePath, resolver);
      return {
        kind: SyntaxKind.Program,
        dependencyFiles: context.dependencyFiles,
        symbol: sourceSymbol,
      };
    }
    async function parseSourceFile(context: ParserContext, uri: string, resolver: SourceFileResolver): Promise<SourceFileSymbol> {
      pathResolver.setEnv('A_LineFile', uri);
      pathResolver.setEnv('A_ScriptDir', path.dirname(uri));

      const sourceText = await resolver(uri);
      const sourceLength = sourceText.length;
      const maskedSourceText = maskContinuationSection(maskBlockComments(sourceText));
      const symbols = await parseGlobalSymbols();

      return {
        kind: SyntaxKind.SourceFile,
        text: sourceText,
        startPosition: 0,
        endPosition: sourceText.length,
        // range,
        symbols,
      };

      async function parseSymbol(result: MatcherResult): Promise<SymbolNode | undefined> {
        consumeSkipNode(result);

        let symbol: SymbolNode | undefined;
        switch (result.kind) {
          case SyntaxKind.DebugDirectiveTrivia: symbol = await parseDebugDirectiveSymbol(result); break;
          case SyntaxKind.IncludeStatement: symbol = await parseIncludeSymbol(result); break;
          case SyntaxKind.FunctionDeclaration: symbol = await parseFunctionSymbol(result); break;
          case SyntaxKind.ClassDeclaration: symbol = await parseClassSymbol(result); break;
          case SyntaxKind.MethodDeclaration: symbol = await parseMethodSymbol(result); break;
          case SyntaxKind.PropertyDeclaration: symbol = await parsePropertySymbol(result); break;
          case SyntaxKind.GetterDeclaration: symbol = await parseGetterSymbol(result); break;
          case SyntaxKind.SetterDeclaration: symbol = await parseSetterSymbol(result); break;
          default: break;
        }

        if (symbol) {
          context.index = symbol.endPosition + 1;
          return symbol;
        }
        return undefined;
      }
      async function parseSymbols(symbolNameOrNames: SymbolName | SymbolName[], isBlock = false): Promise<SymbolNode[]> {
        const symbolNames = Array.isArray(symbolNameOrNames) ? symbolNameOrNames : [ symbolNameOrNames ];
        const symbols: SymbolNode[] = [];
        while (context.index < sourceLength) {
          const result = matchSymbol(isBlock ? [ ...symbolNames, 'endBlock' ] : symbolNames);
          if (!result) {
            break;
          }
          if (isBlock && result.kind === SyntaxKind.CloseBraceToken) {
            break;
          }

          // eslint-disable-next-line no-await-in-loop
          const symbol = await parseSymbol(result);
          if (symbol) {
            symbols.push(symbol);
            continue;
          }
          break;
        }
        return symbols;
      }
      async function parseGlobalSymbols(): Promise<SymbolNode[]> {
        return parseSymbols(globalSymbolNames);
      }
      async function parseBlock(blockStartIndex: number, symbolNames: SymbolName[]): Promise<BlockSymbol> {
        context.index = blockStartIndex + 1;
        const symbols = await parseSymbols(symbolNames, true);
        const result = matchSymbol([ 'endBlock' ]);
        return {
          kind: SyntaxKind.Block,
          startPosition: blockStartIndex,
          endPosition: result ? result.startIndex + 1 : blockStartIndex,
          symbols,
        };
      }
      async function parseDebugDirectiveSymbol(result: DebugDirectiveMatcherResult): Promise<DebugDirectiveSymbol> {
        return Promise.resolve({
          kind: SyntaxKind.DebugDirectiveTrivia,
          action: result.action,
          argsText: result.argsText,
          startPosition: result.startIndex,
          endPosition: result.endIndex,
        });
      }
      async function parseIncludeSymbol(result: IncludeMatcherResult): Promise<IncludeSymbol | undefined> {
        const cwd = pathResolver.getCurrentDirectory();
        const filePath = pathResolver.resolve(result.path)?.toLowerCase();
        if (!filePath || !fileExists(filePath)) {
          return undefined;
        }

        const isLoadedScript = context.dependencyFiles.includes(filePath);
        if (!result.isAgain && isLoadedScript) {
          return undefined;
        }
        context.dependencyFiles.push(filePath);

        const symbol = result.isAgain && includeCache.has(filePath)
          ? includeCache.get(filePath)!
          : await parseSourceFile(context, filePath, resolver);

        includeCache;
        pathResolver.setCurrentDirectory(cwd);
        return Promise.resolve({
          kind: SyntaxKind.IncludeStatement,
          path: filePath,
          startPosition: result.startIndex,
          endPosition: result.endIndex,
          symbol,
        });
      }
      async function parseFunctionSymbol(result: FunctionMatcherResult): Promise<FunctionSymbol> {
        const block = await parseBlock(result.blockStartIndex, localSymbolNames);
        return {
          kind: SyntaxKind.FunctionDeclaration,
          name: result.name,
          startPosition: result.startIndex,
          endPosition: block.endPosition,
          block,
        };
      }
      async function parseClassSymbol(result: ClassMatcherResult): Promise<ClassSymbol> {
        const block = await parseBlock(result.blockStartIndex, classSymbolNames);
        return {
          kind: SyntaxKind.ClassDeclaration,
          name: result.name,
          extends: result.superClassName,
          startPosition: result.startIndex,
          endPosition: block.endPosition,
          block,
        };
      }
      async function parseMethodSymbol(result: MethodMatcherResult): Promise<MethodSymbol> {
        const block = await parseBlock(result.blockStartIndex, localSymbolNames);
        return {
          kind: SyntaxKind.MethodDeclaration,
          modifier: result.modifier,
          name: result.name,
          startPosition: result.startIndex,
          endPosition: block.endPosition,
          block,
        };
      }
      async function parsePropertySymbol(result: PropertyMatcherResult): Promise<PropertySymbol> {
        const block = await parseBlock(result.blockStartIndex, propertySymbolNames);
        return {
          kind: SyntaxKind.PropertyDeclaration,
          name: result.name,
          startPosition: result.startIndex,
          endPosition: block.endPosition,
          block,
        };
      }
      async function parseGetterSymbol(result: GetterMatcherResult): Promise<GetterSymbol> {
        const block = await parseBlock(result.blockStartIndex, localSymbolNames);
        return {
          kind: SyntaxKind.GetterDeclaration,
          startPosition: result.startIndex,
          endPosition: block.endPosition,
          block,
        };
      }
      async function parseSetterSymbol(result: SetterMatcherResult): Promise<SetterSymbol> {
        const block = await parseBlock(result.blockStartIndex, localSymbolNames);
        return {
          kind: SyntaxKind.SetterDeclaration,
          startPosition: result.startIndex,
          endPosition: block.endPosition,
          block,
        };
      }
      function consumeSkipNode(result: MatcherResult): void {
        context.index = result.startIndex;
      }
      // #region utils
      function matchSymbol(name: SymbolName | SymbolName[]): MatcherResult | undefined {
        const symbolNames = Array.isArray(name) ? name : [ name ];

        let target: MatcherResult | undefined;
        for (const symbolName of symbolNames) {
          const matcher = symbolMatcherMap[symbolName];
          const result = matcher(maskedSourceText, context.index);
          if (result) {
            if (!target || (result.startIndex < target.startIndex)) {
              target = result;
            }
          }
        }
        return target;
      }
      // #endregion utils
    }
  }

  // #region utils
  function createSymbolMatcherMap(version: ParsedAutoHotkeyVersion): SymbolMatcherMap {
    const identifierRegExp = 2 <= version.mejor ? /[\w_]+/u : /[\w_$#@]+/u;
    const startStatementRegExp = /(?<skip>.*?)(?<=^|\r\n|\n|\uFEFF)(?<indent>[^\S\r\n]*)/u;
    const startBlockRegExp = /[^\r\n]*(?:\{(?:\s*$|\s;)|(?:((\r\n|\n)[^\S\r\n]*)*\s*)\{)/u;
    const endLineRegExp = /(\s+;[^\r\n]*|\s*)$/u;
    const includeRegExp = new RegExp(`${startStatementRegExp.source}(?<include>#(?<includeKind>Include|IncludeAgain)\\s+(?<optional>\\*i)?\\s*(?<path>[^\r\n]+))${endLineRegExp.source}`, 'siu');
    const functionRegExp = new RegExp(`${startStatementRegExp.source}(?<function>(?<name>${identifierRegExp.source})\\([^\r\n]*${startBlockRegExp.source})`, 'siu');
    const classRegExp = new RegExp(`${startStatementRegExp.source}(?<class>class\\s+(?<name>${identifierRegExp.source})(?:\\s+extends\\s+(?<superClassName>(${identifierRegExp.source}[.]?)*))?${startBlockRegExp.source})`, 'siu');
    const methodRegExp = new RegExp(`${startStatementRegExp.source}(?<method>(?:(?<modifier>static)\\s+)?(?<name>${identifierRegExp.source})\\([^\r\n]*${startBlockRegExp.source})`, 'siu');
    const propertyRegExp = new RegExp(`${startStatementRegExp.source}(?<property>(?<name>${identifierRegExp.source})${startBlockRegExp.source})`, 'siu');
    const getterRegExp = new RegExp(`${startStatementRegExp.source}(?<getter>get${startBlockRegExp.source})`, 'siu');
    const setterRegExp = new RegExp(`${startStatementRegExp.source}(?<setter>set${startBlockRegExp.source})`, 'siu');
    const debugDirectiveRegExp = new RegExp(`${startStatementRegExp.source}(?<directive>;\\s*@Debug-(?<action>[\\w_]+)\\s*(?<arguments>[^\r\n]*))[^\\S\\r\\n]*`, 'siu');
    const endBlockRegExp = new RegExp(`${startStatementRegExp.source}\\}`, 'siu');

    return {
      directive(sourceText, index) {
        const match = sourceText.slice(index).match(debugDirectiveRegExp);
        if (match?.index === undefined) {
          return undefined;
        }

        const action = match.groups?.action;
        const argsText = match.groups?.arguments;
        const startIndex = index + (match.groups?.skip.length ?? 0) + (match.groups?.indent.length ?? 0);
        const endIndex = startIndex + (match.groups?.directive.length ?? 0);
        return { kind: SyntaxKind.DebugDirectiveTrivia, action, argsText, startIndex, endIndex };
      },
      include(sourceText, index) {
        const match = sourceText.slice(index).match(includeRegExp);
        if (match?.index === undefined) {
          return undefined;
        }

        const startIndex = index + (match.groups?.skip.length ?? 0) + (match.groups?.indent.length ?? 0);
        const path = (match.groups?.path ?? '').trim();
        const endIndex = startIndex + (match.groups?.include.length ?? 0);
        const isOptional = Boolean(match.groups?.optional);
        const isAgain = match.groups?.includeKind.toLowerCase() === 'includeagain';
        return { kind: SyntaxKind.IncludeStatement, startIndex, endIndex, path, isOptional, isAgain };
      },
      function(sourceText, index) {
        const match = sourceText.slice(index).match(functionRegExp);
        if (match?.index === undefined) {
          return undefined;
        }

        const startIndex = index + (match.groups?.skip.length ?? 0) + (match.groups?.indent.length ?? 0);
        const name = match.groups?.name ?? '';
        const blockStartIndex = startIndex + (match.groups?.function ?? '').lastIndexOf('{');
        return { kind: SyntaxKind.FunctionDeclaration, startIndex, name, blockStartIndex };
      },
      class(sourceText, index) {
        const match = sourceText.slice(index).match(classRegExp);
        if (match?.index === undefined) {
          return undefined;
        }

        const startIndex = index + (match.groups?.skip.length ?? 0) + (match.groups?.indent.length ?? 0);
        const name = match.groups?.name ?? '';
        const superClassName = match.groups?.superClassName;
        const blockStartIndex = startIndex + (match.groups?.class ?? '').lastIndexOf('{');
        return { kind: SyntaxKind.ClassDeclaration, startIndex, name, superClassName, blockStartIndex };
      },
      method(sourceText, index) {
        const match = sourceText.slice(index).match(methodRegExp);
        if (match?.index === undefined) {
          return undefined;
        }

        const startIndex = index + (match.groups?.skip.length ?? 0) + (match.groups?.indent.length ?? 0);
        const name = match.groups?.name ?? '';
        const modifier = match.groups?.modifier;
        const blockStartIndex = startIndex + (match.groups?.method ?? '').lastIndexOf('{');
        return { kind: SyntaxKind.MethodDeclaration, startIndex, modifier, name, blockStartIndex };
      },
      property(sourceText, index) {
        const match = sourceText.slice(index).match(propertyRegExp);
        if (match?.index === undefined) {
          return undefined;
        }

        const startIndex = index + (match.groups?.skip.length ?? 0) + (match.groups?.indent.length ?? 0);
        const name = match.groups?.name ?? '';
        // const modifier = match.groups?.modifier;
        const blockStartIndex = startIndex + (match.groups?.property ?? '').lastIndexOf('{');
        return { kind: SyntaxKind.PropertyDeclaration, startIndex, name, blockStartIndex };
      },
      getter(sourceText, index) {
        const match = sourceText.slice(index).match(getterRegExp);
        if (match?.index === undefined) {
          return undefined;
        }

        const startIndex = index + (match.groups?.skip.length ?? 0) + (match.groups?.indent.length ?? 0);
        const blockStartIndex = startIndex + (match.groups?.getter ?? '').lastIndexOf('{');
        return { kind: SyntaxKind.GetterDeclaration, startIndex, blockStartIndex };
      },
      setter(sourceText, index) {
        const match = sourceText.slice(index).match(setterRegExp);
        if (match?.index === undefined) {
          return undefined;
        }

        const startIndex = index + (match.groups?.skip.length ?? 0) + (match.groups?.indent.length ?? 0);
        const blockStartIndex = startIndex + (match.groups?.setter ?? '').lastIndexOf('{');
        return { kind: SyntaxKind.SetterDeclaration, startIndex, blockStartIndex };
      },
      endBlock(sourceText, index) {
        const match = sourceText.slice(index).match(endBlockRegExp);
        if (match?.index === undefined) {
          return undefined;
        }

        const startIndex = index + match[0].indexOf('}');
        return { kind: SyntaxKind.CloseBraceToken, startIndex };
      },
    } as SymbolMatcherMap;
  }
  // #endregion utils
};
