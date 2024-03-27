import { describe, expect, test } from '@jest/globals';
import { maskBlockComments } from '../../../../../src/tools/autohotkey/parser/symbol/utils';

describe('utils', () => {
  test('maskBlockComments', () => {
    const actual = maskBlockComments(`
      /*
        multi line
       */
    `);
    expect(actual).toBe(`
      /*
        ***** ****
       */
    `);
  });
});
