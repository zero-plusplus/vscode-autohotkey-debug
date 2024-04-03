import { describe, expect, test } from '@jest/globals';
import { replaceLines } from '../../src/tools/string';

describe('string', () => {
  test('replaceLines', () => {
    const actual = replaceLines('a\r\nb\nc', (lineText) => '*'.repeat(lineText.length));
    expect(actual).toBe('*\r\n*\n*');
  });
});
