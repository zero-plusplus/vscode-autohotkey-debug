import { describe, expect, test } from '@jest/globals';
import { directoryExists, fileExists, isFloat } from '../../src/tools/predicate';

describe('predicate', () => {
  test('directoryExists', () => {
    expect(directoryExists(__dirname)).toBeTruthy();
  });
  test('fileExists', () => {
    expect(fileExists(__filename)).toBeTruthy();
  });
  test.each`
    value         | expected
    ${123}        | ${false}
    ${123.456}    | ${true}
    ${''}         | ${false}
    ${'123'}      | ${false}
    ${'123.456'}  | ${true}
    ${true}       | ${false}
    ${{}}         | ${false}
  `('isFloat', ({ value, expected }) => {
    expect(isFloat(value)).toBe(expected);
  });
});
