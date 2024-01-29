import { describe, expect, test } from '@jest/globals';
import { createCommandArgs, encodeToBase64, escapeCommandArgValue, isDbgpFileName, isUncPath, toDbgpFileName, toFsPath } from '../../src/dbgp/utils';

describe('utils', () => {
  test('isUncPath', () => {
    expect(isUncPath('\\\\server\\share')).toBeTruthy();
  });
  test('isDbgpFileName', () => {
    expect(isDbgpFileName('\\\\server\\share')).toBeTruthy();
    expect(isDbgpFileName('file:C:\\')).toBeTruthy();
  });
  test('toDbgpFileName', () => {
    expect(toDbgpFileName('\\\\server\\share')).toBe('file:///%5c%5cserver%5cshare');
    expect(toDbgpFileName('file:C:\\foo.ts')).toBe('file:///c%3a%5cfoo.ts');
  });
  test('toFsPath', () => {
    expect(toFsPath('\\\\server\\share')).toBe('\\\\server\\share');
    expect(toFsPath('file:C:\\foo.ts')).toBe('c:\\foo.ts');
  });
  test('escapeCommandArgValue', () => {
    expect(escapeCommandArgValue('a"bc"\0')).toBe('"a\\"bc\\"\\0"');
  });
  test('encodeToBase64', () => {
    expect(encodeToBase64('abc')).toBe('YWJj');
  });
  test('createCommandArgs', () => {
    expect(createCommandArgs('-a', true, '-b', false, '-c', undefined, '-d', 123, '-e', 'a"bc"\0')).toEqual([
      '-a',
      '1',
      '-b',
      '0',
      '-d',
      '123',
      '-e',
      '"a\\"bc\\"\\0"',
    ]);
  });
});