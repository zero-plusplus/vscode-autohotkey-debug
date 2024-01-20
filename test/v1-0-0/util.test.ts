import { describe, expect, test } from '@jest/globals';
import { searchPair } from '../../src/v1-0-0/util/util';

describe('utils', () => {
  test('searchPair', () => {
    expect(searchPair('abc[ed[]]', '[', ']')).toStrictEqual(8);
    expect(searchPair('abc]', '[', ']', 1)).toStrictEqual(3);
  });
});
