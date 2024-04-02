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

  describe('ClassDeclaration', () => {
    test('ClassDeclaration', async() => {
      const [ mainPath, sourceText ] = await createFile('main.ahk', `
        class A extends B.C {
        }
        class B {
          class C {
          }
        }
      `);

      const programSymbol = await parser.parse(mainPath);
      const expected: ProgramSymbol = {
        kind: SyntaxKind.Program,
        dependencyFiles: [],
        symbol: {
          kind: SyntaxKind.SourceFile,
          startPosition: 0,
          endPosition: sourceText.length,
          text: sourceText,
          symbols: [
            {
              kind: SyntaxKind.ClassDeclaration,
              name: 'A',
              extends: 'B.C',
              startPosition: 11,
              endPosition: 43,
              block: {
                kind: SyntaxKind.Block,
                startPosition: 31,
                endPosition: 43,
                symbols: [],
              },
            },
            {
              kind: SyntaxKind.ClassDeclaration,
              name: 'B',
              startPosition: 53,
              endPosition: 107,
              block: {
                kind: SyntaxKind.Block,
                startPosition: 61,
                endPosition: 107,
                symbols: [
                  {
                    kind: SyntaxKind.ClassDeclaration,
                    name: 'C',
                    startPosition: 74,
                    endPosition: 96,
                    block: {
                      kind: SyntaxKind.Block,
                      startPosition: 82,
                      endPosition: 96,
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
    test('MethodDeclaration', async() => {
      const [ mainPath, sourceText ] = await createFile('main.ahk', `
        class A {
          instanceMethod(a, b := "abc") {
          }
          static staticMethod() {
          }
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
          endPosition: sourceText.length,
          symbols: [
            {
              kind: SyntaxKind.ClassDeclaration,
              name: 'A',
              extends: undefined,
              startPosition: 11,
              endPosition: 135,
              block: {
                kind: SyntaxKind.Block,
                startPosition: 19,
                endPosition: 135,
                symbols: [
                  {
                    kind: SyntaxKind.MethodDeclaration,
                    modifier: undefined,
                    name: 'instanceMethod',
                    startPosition: 32,
                    endPosition: 76,
                    block: {
                      kind: SyntaxKind.Block,
                      startPosition: 62,
                      endPosition: 76,
                      symbols: [],
                    },
                  },
                  {
                    kind: SyntaxKind.MethodDeclaration,
                    modifier: 'static',
                    name: 'staticMethod',
                    startPosition: 88,
                    endPosition: 124,
                    block: {
                      kind: SyntaxKind.Block,
                      startPosition: 110,
                      endPosition: 124,
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
    test('PropertyDeclaration', async() => {
      const [ mainPath, sourceText ] = await createFile('main.ahk', `
        class A {
          property[a, b := "abc"] {
            get {
            }
            set {
            }
          }
          propertyWithout {
          }
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
          endPosition: sourceText.length,
          symbols: [
            {
              kind: SyntaxKind.ClassDeclaration,
              name: 'A',
              extends: undefined,
              startPosition: 11,
              endPosition: 191,
              block: {
                kind: SyntaxKind.Block,
                startPosition: 19,
                endPosition: 191,
                symbols: [
                  {
                    kind: SyntaxKind.PropertyDeclaration,
                    name: 'property',
                    startPosition: 32,
                    endPosition: 138,
                    block: {
                      kind: SyntaxKind.Block,
                      startPosition: 56,
                      endPosition: 138,
                      symbols: [
                        {
                          kind: SyntaxKind.GetterDeclaration,
                          startPosition: 71,
                          endPosition: 91,
                          block: {
                            kind: SyntaxKind.Block,
                            startPosition: 75,
                            endPosition: 91,
                            symbols: [],
                          },
                        },
                        {
                          kind: SyntaxKind.SetterDeclaration,
                          startPosition: 105,
                          endPosition: 125,
                          block: {
                            kind: SyntaxKind.Block,
                            startPosition: 109,
                            endPosition: 125,
                            symbols: [],
                          },
                        },
                      ],
                    },
                  },
                  {
                    kind: SyntaxKind.PropertyDeclaration,
                    name: 'propertyWithout',
                    startPosition: 150,
                    endPosition: 180,
                    block: {
                      kind: SyntaxKind.Block,
                      startPosition: 166,
                      endPosition: 180,
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
