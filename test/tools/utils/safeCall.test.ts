import { describe, expect, test } from '@jest/globals';
import { safeCall } from '../../../src/tools/utils';

describe('safeCall', () => {
  test('no problem', () => {
    expect(safeCall((value) => value, [ 'abc' ])).toBe('abc');
    expect(safeCall(() => {
      throw Error();
    }, [], 123)).toBe(123);
  });
});
