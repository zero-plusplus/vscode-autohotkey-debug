import { describe, expect, test, xtest } from '@jest/globals';
import * as path from 'path';
import { promises as fs } from 'fs';
import { createRandomFileName, createTempDirectory, createTempDirectoryWithFile, createTempFile } from '../../src/tools/temp';
import { directoryExists, fileExists } from '../../src/tools/predicate';

describe('temp', () => {
  test('createRandomFileName', () => {
    const prefix = 'test';
    const name = createRandomFileName(prefix);
    expect(name).toHaveLength(prefix.length + '-'.length + 6);
  });
  xtest('createTempDirectory', async() => {
    const tempDir = await createTempDirectory('test');
    expect(directoryExists(tempDir.path)).toBeTruthy();

    tempDir.cleanup();
    expect(directoryExists(tempDir.path)).toBeFalsy();
  });
  xtest('createTempFile', async() => {
    const prefix = 'test';
    const extension = '.ahk';
    const contents = `FileAppend, test, *`;
    const tempDir = await createTempDirectory(prefix);
    const tempFile = await createTempFile(tempDir.path, prefix, extension, contents);

    expect(fileExists(tempFile.path)).toBeTruthy();
    expect(await fs.readFile(tempFile.path, 'utf-8')).toBe(contents);
    expect(path.extname(tempFile.path)).toBe(extension);

    tempFile.cleanup();
    tempDir.cleanup();
    expect(fileExists(tempFile.path)).toBeFalsy();
  });
  xtest('createTempDirectoryWithFile', async() => {
    const prefix = 'test';
    const extension = '.ahk';
    const contents = `FileAppend, test, *`;
    const tempFile = await createTempDirectoryWithFile(prefix, extension, contents);

    expect(fileExists(tempFile.path)).toBeTruthy();
    expect(await fs.readFile(tempFile.path, 'utf-8')).toBe(contents);
    expect(path.extname(tempFile.path)).toBe(extension);

    tempFile.cleanup();
    expect(fileExists(tempFile.path)).toBeFalsy();
  });
});
