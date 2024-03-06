import { describe, expect, test } from '@jest/globals';
import { parseAutoHotkeyVersion } from '../../../../src/tools/autohotkey';
import { ParsedAutoHotkeyVersion } from '../../../../src/types/tools/autohotkey/version/common.types';

describe('parseAutoHotkeyVersion', () => {
  test.each`
    rawVersion        | expectedParsedVersion
    ${'1.1.0.0'}      | ${{ mejor: 1.1, minor: 0, patch: 0, raw: '1.1.0.0', version: '1.1.0.0' } as ParsedAutoHotkeyVersion}
    ${'2.0-alpha.1'}  | ${{ mejor: 2, minor: 0, patch: -1, preId: 'alpha', preRelease: 1, raw: '2.0-alpha.1', version: '2.0', preversion: 'alpha.1' } as ParsedAutoHotkeyVersion}
    ${'2.0-beta.1'}   | ${{ mejor: 2, minor: 0, patch: -1, preId: 'beta', preRelease: 1, raw: '2.0-beta.1', version: '2.0', preversion: 'beta.1' } as ParsedAutoHotkeyVersion}
    ${'2.0-rc.1'}     | ${{ mejor: 2, minor: 0, patch: -1, preId: 'rc', preRelease: 1, raw: '2.0-rc.1', version: '2.0', preversion: 'rc.1' } as ParsedAutoHotkeyVersion}
    ${'2.0.0'}        | ${{ mejor: 2, minor: 0, patch: 0, raw: '2.0.0', version: '2.0.0' } as ParsedAutoHotkeyVersion}
    ${'2.1.0'}        | ${{ mejor: 2, minor: 1, patch: 0, raw: '2.1.0', version: '2.1.0' } as ParsedAutoHotkeyVersion}
  `('', ({ rawVersion, expectedParsedVersion }) => {
    expect(parseAutoHotkeyVersion(String(rawVersion))).toEqual(expectedParsedVersion);
  });
});
