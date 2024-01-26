import { describe, expect, test } from '@jest/globals';
import { directoryExists, fileExists } from '../../src/tools/predicate';

describe('predicate', () => {
  test('directoryExists', () => {
    expect(directoryExists(__dirname)).toBeTruthy();
  });
  test('fileExists', () => {
    expect(fileExists(__filename)).toBeTruthy();
  });
});
