import * as fs from 'fs';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { createParser } from '../../../../../src/tools/autohotkey/parser/symbol/parser';
import { TemporaryResource, createTempDirectory } from '../../../../../src/tools/temp';
import { ProgramSymbol } from '../../../../../src/types/tools/autohotkey/parser/symbol/parser.types';
import { SyntaxKind } from '../../../../../src/types/tools/autohotkey/parser/common.types';

describe('parser', () => {
  const parser = createParser('1.0.0');

  let testDir: TemporaryResource;
  const createFile = async(filePath: string, text: string): Promise<[ string, string ]> => {
    const targetPath = (path.isAbsolute(filePath) ? filePath : path.resolve(testDir.path, filePath)).toLowerCase();
    const dirpath = path.dirname(targetPath);
    await fs.promises.mkdir(dirpath, { recursive: true });

    const sourceText = `\uFEFF${text}`.replaceAll('\n', '\r\n');
    await fs.promises.writeFile(targetPath, sourceText, { encoding: 'utf-8' });
    return [ targetPath, sourceText ];
  };
  beforeEach(async() => {
    testDir = await createTempDirectory('symbol-parser');
  });
  afterEach(() => {
    testDir.cleanup();
  });

  test('FunctionDeclaration', async() => {
    const [ mainPath, sourceText ] = await createFile('main.ahk', `
      Foo() {
      }
      Foo2(a := "", b := {}) {
      }
    `);

    const programSymbol = await parser.parse(mainPath);
    const expected: ProgramSymbol = {
      kind: SyntaxKind.Program,
      dependencyFiles: [],
      symbol: {
        kind: SyntaxKind.SourceFile,
        text: sourceText,
        startPosition: 0,
        endPosition: 72,
        symbols: [
          {
            kind: SyntaxKind.FunctionDeclaration,
            name: 'Foo',
            startPosition: 9,
            endPosition: 25,
            block: {
              kind: SyntaxKind.Block,
              startPosition: 15,
              endPosition: 25,
              symbols: [],
            },
          },
          {
            kind: SyntaxKind.FunctionDeclaration,
            name: 'Foo2',
            startPosition: 33,
            endPosition: 66,
            block: {
              kind: SyntaxKind.Block,
              startPosition: 56,
              endPosition: 66,
              symbols: [],
            },
          },
        ],
      },
    };
    expect(programSymbol).toEqual(expected);
  });

  test('Include Statement', async() => {
    const [ mainPath, mainSourceText ] = await createFile('main.ahk', `
      #Include <Foo>
    `);
    const [ libPath, libSourceText ] = await createFile('lib/Foo.ahk', `
      Foo() {
      }
    `);

    const programSymbol = await parser.parse(mainPath);
    const expected: ProgramSymbol = {
      kind: SyntaxKind.Program,
      dependencyFiles: [ libPath ],
      symbol: {
        kind: SyntaxKind.SourceFile,
        startPosition: 0,
        endPosition: 29,
        text: mainSourceText,
        symbols: [
          {
            kind: SyntaxKind.IncludeStatement,
            startPosition: 9,
            endPosition: 23,
            path: libPath,
            symbol: {
              kind: SyntaxKind.SourceFile,
              startPosition: 0,
              endPosition: 31,
              text: libSourceText,
              symbols: [
                {
                  kind: SyntaxKind.FunctionDeclaration,
                  name: 'Foo',
                  startPosition: 9,
                  endPosition: 25,
                  block: {
                    kind: SyntaxKind.Block,
                    startPosition: 15,
                    endPosition: 25,
                    symbols: [],
                  },
                },
              ],
            },
          },
        ],
      },
    };

    expect(programSymbol).toEqual(expected);
  });
});
