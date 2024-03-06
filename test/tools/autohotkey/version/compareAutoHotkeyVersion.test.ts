import { describe, expect, test } from '@jest/globals';
import { compareAutoHotkeyVersion, parseAutoHotkeyVersion } from '../../../../src/tools/autohotkey';

describe('compareAutoHotkeyVersion', () => {
  test.each`
    a                 | b                 | expected
    ${'1.0.0'}        | ${'1.0.1'}        | ${-1}
    ${'1.0.1'}        | ${'1.0.0'}        | ${1}
    ${'1.0.0'}        | ${'1.0.0'}        | ${0}
    ${'2.0'}          | ${'2.0-alpha.0'}  | ${1}
    ${'2.0'}          | ${'2.0-beta.0'}   | ${1}
    ${'2.0'}          | ${'2.0-rc.0'}     | ${1}
    ${'2.0-alpha.0'}  | ${'2.0-beta.0'}   | ${-1}
    ${'2.0-alpha.0'}  | ${'2.0-rc.0'}     | ${-2}
    `('', ({ a, b, expected }) => {
    expect(compareAutoHotkeyVersion(parseAutoHotkeyVersion(String(a)), parseAutoHotkeyVersion(String(b)))).toBe(expected);
  });
});
