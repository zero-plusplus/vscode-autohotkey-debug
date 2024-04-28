import { describe, expect, test } from '@jest/globals';
import { createCommandArgs, encodeToBase64, escapeCommandArgValue, isUncPath, toDbgpFileName, toFsPath } from '../../src/dbgp/utils';

describe('utils', () => {
  test('isUncPath', () => {
    expect(isUncPath('\\\\server\\share')).toBeTruthy();
  });
  test('toDbgpFileName', () => {
    expect(toDbgpFileName('C:\\foo.ts')).toBe('file:///c%3a/foo.ts');
  });
  test('toFsPath', () => {
    expect(toFsPath('\\\\server\\share')).toBe('\\\\server\\share');
  });
  test('escapeCommandArgValue', () => {
    expect(escapeCommandArgValue('var[""]')).toBe('"var[\\"\\"]"');
    expect(escapeCommandArgValue('var["key"]')).toBe('"var[\\"key\\"]"');
    expect(escapeCommandArgValue('var["\\0"]')).toBe('"var[\\"\\0\\"]"');
    expect(escapeCommandArgValue('var["\\a"]')).toBe('"var[\\"\\\\a\\"]"');
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
