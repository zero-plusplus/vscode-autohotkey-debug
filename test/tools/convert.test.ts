import { describe, expect, test } from '@jest/globals';
import { toNumber } from '../../src/tools/convert';

describe('convert', () => {
  test('toNumber', () => {
    expect(toNumber(123)).toBe(123);
    expect(toNumber(NaN)).toBe(-1);
    expect(toNumber('a')).toBe(-1);
    expect(toNumber('a', 5)).toBe(5);
  });
});
