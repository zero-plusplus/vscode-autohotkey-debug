import { describe, expect, test } from '@jest/globals';
import { safeCall } from '../../../src/tools/utils';

describe('safeCall', () => {
  test('no problem', () => {
    expect(safeCall(() => 'abc')).toBe('abc');
    expect(safeCall((): void => {
      throw Error();
    })).toBe(undefined);
  });
});
