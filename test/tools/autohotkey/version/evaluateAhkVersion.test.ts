import * as path from 'path';
import { describe, expect, test } from '@jest/globals';
import { defaultAutoHotkeyInstallDir, evaluateAhkVersion } from '../../../../src/tools/autohotkey';
import { ParsedAutoHotkeyVersion } from '../../../../src/types/tools/autohotkey/version/common.types';

describe('evaluateAhkVersion', () => {
  test.each`
    dirName     | expectedParsedVersion
    ${'v2.0.0'} | ${{ mejor: 2, minor: 0, patch: 0, raw: '2.0.0', version: '2.0.0' } as ParsedAutoHotkeyVersion}
  `('', ({ dirName, expectedParsedVersion }) => {
    expect(evaluateAhkVersion(path.resolve(defaultAutoHotkeyInstallDir, String(dirName), 'AutoHotkey64.exe'))).toEqual(expectedParsedVersion);
  });
});
