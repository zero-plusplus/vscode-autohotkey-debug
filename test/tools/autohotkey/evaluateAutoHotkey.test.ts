import { expect, test, xdescribe } from '@jest/globals';
import { defaultAutoHotkeyRuntimePath_v1, defaultAutoHotkeyRuntimePath_v2, evaluateAutoHotkey } from '../../../src/tools/autohotkey';

xdescribe('version', () => {
  test('evaluateAutoHotkey', () => {
    expect(evaluateAutoHotkey(defaultAutoHotkeyRuntimePath_v1, '"abc"')).toBe('abc');
    expect(evaluateAutoHotkey(defaultAutoHotkeyRuntimePath_v2, '"abc"')).toBe('abc');
  });
});
