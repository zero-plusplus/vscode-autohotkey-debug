import * as fs from 'fs';
import { SyntaxKind } from '../../../../types/tools/autohotkey/parser/common.types';
import { MatcherResult, Parser, ParserContext as Parsingontext, ProgramSymbol, SourceFileResolver, SourceFileSymbol, SymbolMatcherMap, SymbolName, SymbolNode } from '../../../../types/tools/autohotkey/parser/symbol/parser.types';
import { AutoHotkeyVersion, ParsedAutoHotkeyVersion } from '../../../../types/tools/autohotkey/version/common.types';
import { TimeoutError, timeoutPromise } from '../../../promise';
import { parseAutoHotkeyVersion } from '../../version';
import { maskBlockComments } from './utils';

const defaultResolver = async(filePath: string): Promise<string> => fs.promises.readFile(filePath, 'utf-8');
export const createParser = (rawVersion: AutoHotkeyVersion | ParsedAutoHotkeyVersion, resolver: SourceFileResolver = defaultResolver, timeout_ms?: number): Parser => {
  const version = typeof rawVersion === 'string' ? parseAutoHotkeyVersion(rawVersion) : rawVersion;
  const symbolMatcherMap = createSymbolMatcherMap(version);

  return {
    parse: async(rootFilePath: string): Promise<ProgramSymbol | TimeoutError> => {
      if (typeof timeout_ms === 'number') {
        return timeoutPromise(parseProgramSymbol(rootFilePath, resolver), timeout_ms);
      }
      return parseProgramSymbol(rootFilePath, resolver);
    },
  };

  async function parseProgramSymbol(uri: string, resolver: SourceFileResolver): Promise<ProgramSymbol> {
    const dependencyFiles: string[] = [];
    const sourceSymbol = await parseSourceFile(uri, resolver, dependencyFiles);
    return {
      kind: SyntaxKind.Program,
      dependencyFiles,
      symbol: sourceSymbol,
    };
  }
  async function parseSourceFile(uri: string, resolver: SourceFileResolver, dependencyFiles: string[]): Promise<SourceFileSymbol> {
    const context: Parsingontext = {
      index: 0,
      dependencyFiles,
    };

    const sourceText = await resolver(uri);
    const sourceLength = sourceText.length;
    const maskedSourceText = maskBlockComments(sourceText);
    const symbols = await parseGlobalSymbols();
    const startPosition = (symbols.at(0)?.startPosition ?? 0);
    // const range: SymbolRange = {
    //   start: symbols.at(0)?.range.start ?? { line: 0, character: 0 },
    //   end: symbols.at(-1)?.range.start ?? symbols.at(0)?.range.start ?? { line: 0, character: 0 },
    // };

    return {
      kind: SyntaxKind.SourceFile,
      text: sourceText,
      startPosition,
      endPosition: (symbols.at(-1)?.endPosition ?? startPosition),
      // range,
      symbols,
    };

    async function parseGlobalSymbols(): Promise<SymbolNode[]> {
      while (context.index < sourceLength) {
        const result = matchSymbol([ 'class', 'include', 'function' ]);
        if (!result) {
          break;
        }

        consumeSkipNode(result);
        if (result.kind === SyntaxKind.FunctionDeclaration) {
          continue;
        }

        break;
      }
      return Promise.resolve([]);
    }
    function consumeSkipNode(result: MatcherResult): void {
      context.index = result.startIndex;
    }
    // #region utils
    function matchSymbol(name: SymbolName | SymbolName[]): MatcherResult | undefined {
      const symbolNames = Array.isArray(name) ? name : [ name ];
      const targetText = maskedSourceText.slice(context.index);

      let target: MatcherResult | undefined;
      for (const symbolName of symbolNames) {
        const matcher = symbolMatcherMap[symbolName];
        const result = matcher(targetText);
        if (target && result && result.startIndex < target.startIndex) {
          target = result;
        }
      }
      return target;
    }
    // #endregion utils
  }

  // #region utils
  function createSymbolMatcherMap(version: ParsedAutoHotkeyVersion): SymbolMatcherMap {
    const identifierRegExp = 2 <= version.mejor ? /[\w_]+/u : /[\w_$#@]+/u;
    const startStatementRegExp = /(?<skip>.*?)(?<=^|\r\n|\n|\uFEFF)(?<indent>\s*)/u;
    const startBlockRegExp = /\s*(?:\{(?:\s*$|\s;)|(?:((\r\n|\n)[^\S\r\n]*)*\s*)\{)/u;
    const classRegExp = new RegExp(`${startStatementRegExp.source}(?<class>class\\s+(?<name>${identifierRegExp.source}))(?:\\s+extends\\s+(?<extends>${identifierRegExp.source}))?${startBlockRegExp.source}`, 'siu');
    const includeRegExp = new RegExp(`${startStatementRegExp.source}(?<include>#(?<includeKind>Include|IncludeAgain)\\s+(?<optional>\\*i)?\\s*(?<includePath>[^\r\n]+))`, 'siu');
    const functionRegExp = new RegExp(`${startStatementRegExp.source}(?<function>)(?<name>${identifierRegExp.source})\\(.*${startBlockRegExp.source}`, 'siu');
    const propertyRegExp = new RegExp(`${startStatementRegExp.source}(?<property>)(?<name>${identifierRegExp.source})${startBlockRegExp.source}`, 'siu');
    const getterRegExp = new RegExp(`${startStatementRegExp.source}(?<getter>get${startBlockRegExp.source})`, 'siu');
    const setterRegExp = new RegExp(`${startStatementRegExp.source}(?<setter>set${startBlockRegExp.source})`, 'siu');
    console.log([
      classRegExp,
      includeRegExp,
      functionRegExp,
      propertyRegExp,
      getterRegExp,
      setterRegExp,
    ]);
    return {
      include() {
        return { kind: SyntaxKind.IncludeStatement, startIndex: 0, endIndex: 0, path: '', type: 'file' };
      },
      function() {
        return { kind: SyntaxKind.FunctionDeclaration, startIndex: 0, endIndex: 0, name: '' };
      },
      class() {
        return { kind: SyntaxKind.ClassDeclaration, startIndex: 0, endIndex: 0, name: '', extends: '' };
      },
      method() {
        return { kind: SyntaxKind.MethodDeclaration, startIndex: 0, endIndex: 0, name: '', extends: '' };
      },
      property() {
        return { kind: SyntaxKind.PropertyDeclaration, startIndex: 0, endIndex: 0, name: '', extends: '' };
      },
      getter() {
        return { kind: SyntaxKind.GetterDeclaration, startIndex: 0, endIndex: 0 };
      },
      setter() {
        return { kind: SyntaxKind.SetterDeclaration, startIndex: 0, endIndex: 0 };
      },
    } as SymbolMatcherMap;
  }
  // #endregion utils
};
