import * as path from 'path';
import * as fs from 'fs';
import { SyntaxKind } from '../../../../types/tools/autohotkey/parser/common.types';
import { BlockSymbol, FunctionMatcherResult, FunctionSymbol, IncludeMatcherResult, IncludeSymbolNode, MatcherResult, Parser, ParserContext, ProgramSymbol, SourceFileResolver, SourceFileSymbol, SymbolMatcherMap, SymbolName, SymbolNode } from '../../../../types/tools/autohotkey/parser/symbol/parser.types';
import { AutoHotkeyVersion, ParsedAutoHotkeyVersion } from '../../../../types/tools/autohotkey/version/common.types';
import { parseAutoHotkeyVersion } from '../../version';
import { maskBlockComments } from './utils';
import { PartialedAutoHotkeyEnvironments } from '../../../../types/tools/autohotkey/path/resolver.types';
import { createPathResolver } from '../../path/resolver';
import { fileExists } from '../../../predicate';

export const defaultFilePathResolver = async(filePath: string): Promise<string> => fs.promises.readFile(filePath, 'utf-8');
export const createParser = (rawVersion: AutoHotkeyVersion | ParsedAutoHotkeyVersion, resolver: SourceFileResolver = defaultFilePathResolver, timeout_ms?: number): Parser => {
  const version = typeof rawVersion === 'string' ? parseAutoHotkeyVersion(rawVersion) : rawVersion;

  const symbolMatcherMap = createSymbolMatcherMap(version);
  const globalSymbolNames: SymbolName[] = [ 'include', 'function', 'class' ];
  // const classSymbolNames: SymbolName[] = [ 'include', 'class', 'method', 'property', 'getter', 'setter', 'endBlock' ];

  return {
    parse,
  };

  async function parse(rootFilePath: string, env?: PartialedAutoHotkeyEnvironments): Promise<ProgramSymbol> {
    const pathResolver = createPathResolver(version, env);
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
      const maskedSourceText = maskBlockComments(sourceText);
      const symbols = await parseGlobalSymbols();

      return {
        kind: SyntaxKind.SourceFile,
        text: sourceText,
        startPosition: 0,
        endPosition: sourceText.length,
        // range,
        symbols,
      };

      async function parseGlobalSymbols(): Promise<SymbolNode[]> {
        return parseSymbols(globalSymbolNames);
      }
      async function parseBlock(blockStartIndex: number): Promise<BlockSymbol > {
        context.index = blockStartIndex + 1;
        const symbols = await parseSymbols(globalSymbolNames, true);
        const result = matchSymbol([ 'endBlock' ]);
        return {
          kind: SyntaxKind.Block,
          startPosition: blockStartIndex,
          endPosition: result ? result.startIndex + 1 : blockStartIndex,
          symbols,
        };
      }
      async function parseFunctionSymbol(result: FunctionMatcherResult): Promise<FunctionSymbol> {
        const block = await parseBlock(result.blockStartIndex);
        return {
          kind: SyntaxKind.FunctionDeclaration,
          name: result.name,
          startPosition: result.startIndex,
          endPosition: block.endPosition,
          block,
        };
      }
      async function parseSymbol(result: MatcherResult): Promise<SymbolNode | undefined> {
        consumeSkipNode(result);

        if (result.kind === SyntaxKind.IncludeStatement) {
          return parseIncludeSymbol(result);
        }
        if (result.kind === SyntaxKind.FunctionDeclaration) {
          return parseFunctionSymbol(result);
        }
        return undefined;
      }
      async function parseIncludeSymbol(result: IncludeMatcherResult): Promise<IncludeSymbolNode | undefined> {
        const cwd = pathResolver.getCurrentDirectory();
        const filePath = pathResolver.resolve(result.path)?.toLowerCase();
        if (!filePath || !fileExists(filePath)) {
          return undefined;
        }
        if (context.dependencyFiles.includes(filePath)) {
          return undefined;
        }
        context.dependencyFiles.push(filePath);

        const symbol = await parseSourceFile(context, filePath, resolver);
        pathResolver.setCurrentDirectory(cwd);
        return Promise.resolve({
          kind: SyntaxKind.IncludeStatement,
          path: filePath,
          startPosition: result.startIndex,
          endPosition: result.endIndex,
          symbol,
        });
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
      function consumeSkipNode(result: MatcherResult): void {
        context.index = result.startIndex;
      }
      // #region utils
      function matchSymbol(name: SymbolName | SymbolName[], isBlock = false): MatcherResult | undefined {
        const symbolNames = Array.isArray(name) ? name : [ name ];
        if (isBlock) {
          symbolNames.push('endBlock');
        }

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
    const classRegExp = new RegExp(`${startStatementRegExp.source}(?<class>class\\s+(?<name>${identifierRegExp.source}))(?:\\s+extends\\s+(?<superClassName>(${identifierRegExp.source}[.]?)*))?${startBlockRegExp.source}`, 'siu');
    const methodRegExp = new RegExp(`${startStatementRegExp.source}(?<method>(?<modifier>static\\s+)?(?<name>${identifierRegExp.source})\\(.*${startBlockRegExp.source})`, 'siu');
    const propertyRegExp = new RegExp(`${startStatementRegExp.source}(?<property>(?<name>${identifierRegExp.source})${startBlockRegExp.source})`, 'siu');
    const getterRegExp = new RegExp(`${startStatementRegExp.source}(?<getter>get${startBlockRegExp.source})`, 'siu');
    const setterRegExp = new RegExp(`${startStatementRegExp.source}(?<setter>set${startBlockRegExp.source})`, 'siu');
    const endBlockRegExp = new RegExp(`${startStatementRegExp.source}\\}`, 'siu');

    return {
      include(sourceText, index) {
        const match = sourceText.slice(index).match(includeRegExp);
        if (match?.index === undefined) {
          return undefined;
        }

        const startIndex = index + (match.groups?.skip.length ?? 0) + (match.groups?.indent.length ?? 0);
        const path = (match.groups?.path ?? '').trim();
        const endIndex = startIndex + (match.groups?.include.length ?? 0);
        return { kind: SyntaxKind.IncludeStatement, startIndex, endIndex, path };
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
        const superClassName = match.groups?.superClassName ?? '';
        return { kind: SyntaxKind.ClassDeclaration, startIndex, name, superClassName };
      },
      method(sourceText, index) {
        const match = sourceText.slice(index).match(methodRegExp);
        if (match?.index === undefined) {
          return undefined;
        }

        const startIndex = index + (match.groups?.skip.length ?? 0) + (match.groups?.indent.length ?? 0);
        const name = match.groups?.name ?? '';
        const modifier = match.groups?.modifier;
        return { kind: SyntaxKind.MethodDeclaration, startIndex, modifier, name };
      },
      property(sourceText, index) {
        const match = sourceText.slice(index).match(propertyRegExp);
        if (match?.index === undefined) {
          return undefined;
        }

        const startIndex = index + (match.groups?.skip.length ?? 0) + (match.groups?.indent.length ?? 0);
        const name = match.groups?.name ?? '';
        // const modifier = match.groups?.modifier;
        return { kind: SyntaxKind.PropertyDeclaration, startIndex, name };
      },
      getter(sourceText, index) {
        const match = sourceText.slice(index).match(getterRegExp);
        if (match?.index === undefined) {
          return undefined;
        }

        const startIndex = index + (match.groups?.skip.length ?? 0) + (match.groups?.indent.length ?? 0);
        return { kind: SyntaxKind.GetterDeclaration, startIndex };
      },
      setter(sourceText, index) {
        const match = sourceText.slice(index).match(setterRegExp);
        if (match?.index === undefined) {
          return undefined;
        }

        const startIndex = index + (match.groups?.skip.length ?? 0) + (match.groups?.indent.length ?? 0);
        return { kind: SyntaxKind.SetterDeclaration, startIndex };
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
