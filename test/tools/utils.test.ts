import { describe, expect, test } from '@jest/globals';
import { safeCall } from '../../src/tools/utils';

describe('utils', () => {
  test('safeCall', () => {
    expect(safeCall((value) => value, [ 'abc' ])).toBe('abc');
    expect(safeCall(() => {
      throw Error();
    }, [], 123)).toBe(123);
  });
});
