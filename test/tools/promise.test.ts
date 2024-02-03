import { describe, expect, test } from '@jest/globals';
import { TimeoutError, sleep, timeoutPromise } from '../../src/tools/promise';

describe('promise', () => {
  test('timeoutPromise / sleep', () => {
    expect(timeoutPromise(sleep(1000), 500)).rejects.toThrow(TimeoutError);
  });
});
