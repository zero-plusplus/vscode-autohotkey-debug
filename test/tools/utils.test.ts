import { describe, expect, test } from '@jest/globals';
import { TimeoutError, safeCall, sleep, timeoutPromise } from '../../src/tools/utils';

describe('utils', () => {
  test('safeCall', () => {
    expect(safeCall((value) => value, [ 'abc' ])).toBe('abc');
    expect(safeCall(() => {
      throw Error();
    }, [], 123)).toBe(123);
  });
  test('timeoutPromise / sleep', () => {
    expect(timeoutPromise(sleep(1000), 500)).rejects.toThrow(TimeoutError);
  });
});
