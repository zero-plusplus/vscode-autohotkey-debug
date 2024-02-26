import { describe, expect, test } from '@jest/globals';
import { memoize } from '../../../src/tools/utils/memoize';

describe('memoize', () => {
  const originalFunction = (): object => ({});
  const memoizedFunction = memoize(originalFunction);

  test('not memoized', () => {
    expect(originalFunction()).not.toBe(originalFunction());
  });
  test('memoized', () => {
    expect(memoizedFunction()).toBe(memoizedFunction());
  });
});
