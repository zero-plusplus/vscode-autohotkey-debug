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
  beforeEach(async() => {
    testDir = await createTempDirectory('symbol-parser');
  });
  afterEach(() => {
    testDir.cleanup();
  });

  test('FunctionDeclaration', async() => {
    const mainPath = path.resolve(testDir.path, 'main.ahk');
    const libPath = path.resolve(testDir.path, 'lib');
    await fs.promises.mkdir(libPath);
    const sourceText = `
      Foo() {
      }
      Foo2(a := "", b := {}) {
      }
    `.replaceAll('\n', '\r\n');
    await fs.promises.writeFile(mainPath, sourceText, 'utf-8');

    const programSymbol = await parser.parse(mainPath);
    const expected: ProgramSymbol = {
      kind: SyntaxKind.Program,
      dependencyFiles: [],
      symbol: {
        kind: SyntaxKind.SourceFile,
        text: sourceText,
        startPosition: 0,
        endPosition: 71,
        symbols: [
          {
            kind: SyntaxKind.FunctionDeclaration,
            name: 'Foo',
            startPosition: 8,
            endPosition: 24,
            block: {
              kind: SyntaxKind.Block,
              startPosition: 14,
              endPosition: 24,
              symbols: [],
            },
          },
          {
            kind: SyntaxKind.FunctionDeclaration,
            name: 'Foo2',
            startPosition: 32,
            endPosition: 65,
            block: {
              kind: SyntaxKind.Block,
              startPosition: 55,
              endPosition: 65,
              symbols: [],
            },
          },
        ],
      },
    };
    expect(programSymbol).toEqual(expected);
  });
});
