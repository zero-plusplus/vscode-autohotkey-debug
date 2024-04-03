import { describe, expect, test } from '@jest/globals';
import { maskBlockComments, maskContinuationSection } from '../../../../../src/tools/autohotkey/parser/symbol/utils';

describe('utils', () => {
  test('maskContinuationSection', () => {
    const actual = maskContinuationSection(`
      (LTrim
        foo
      )
    `);
    expect(actual).toBe(`
      (LTrim
        ***
      )
    `);
  });
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
