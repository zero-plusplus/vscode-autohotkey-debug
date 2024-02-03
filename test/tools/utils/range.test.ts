import { describe, expect, test } from '@jest/globals';
import { RangeError, range } from '../../../src/tools/utils';

describe('range', () => {
  describe('non-problem', () => {
    test('range(count)', () => {
      expect(range(3)).toEqual([ 0, 1, 2 ]);
    });
    test('range(first, last)', () => {
      expect(range(2, 5)).toEqual([ 2, 3, 4, 5 ]);
    });
    test('range(begin-end)', () => {
      expect(range(2, 5, true)).toEqual([ 2, 3, 4 ]);
    });
  });

  describe('error', () => {
    test('range error', () => {
      expect(() => range(5, 2)).toThrowError(RangeError);
    });
  });
});
