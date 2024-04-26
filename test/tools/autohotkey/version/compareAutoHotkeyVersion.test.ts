import { describe, expect, test } from '@jest/globals';
import { compareAutoHotkeyVersion, compareAutoHotkeyVersionByOperator, parseAutoHotkeyVersion } from '../../../../src/tools/autohotkey';

describe('compareAutoHotkeyVersion', () => {
  test('compareAutoHotkeyVersion', () => {
    expect(compareAutoHotkeyVersion('1.0.0', parseAutoHotkeyVersion('1.0.1'))).toBe(-1);
    expect(compareAutoHotkeyVersion('1.0.1', parseAutoHotkeyVersion('1.0.0'))).toBe(1);
    expect(compareAutoHotkeyVersion('1.0.0', parseAutoHotkeyVersion('1.0.0'))).toBe(0);
    expect(compareAutoHotkeyVersion('2.0', parseAutoHotkeyVersion('2.0-alpha.0'))).toBe(1);
    expect(compareAutoHotkeyVersion('2.0', parseAutoHotkeyVersion('2.0-beta.0'))).toBe(1);
    expect(compareAutoHotkeyVersion('2.0', parseAutoHotkeyVersion('2.0-rc.0'))).toBe(1);
    expect(compareAutoHotkeyVersion('2.0-alpha.0', parseAutoHotkeyVersion('2.0-beta.0'))).toBe(-1);
    expect(compareAutoHotkeyVersion('2.0-alpha.0', parseAutoHotkeyVersion('2.0-rc.0'))).toBe(-2);
  });

  test('compareAutoHotkeyVersionByOperator', () => {
    expect(compareAutoHotkeyVersionByOperator('1.0.0', '=', '1.0.0')).toBe(true);
    expect(compareAutoHotkeyVersionByOperator('1.0.0', '<', '1.0.0')).toBe(false);
    expect(compareAutoHotkeyVersionByOperator('1.0.0', '<=', '1.0.0')).toBe(true);
    expect(compareAutoHotkeyVersionByOperator('1.0.0', '>', '1.0.0')).toBe(false);
    expect(compareAutoHotkeyVersionByOperator('1.0.0', '>=', '1.0.0')).toBe(true);

    expect(compareAutoHotkeyVersionByOperator('1.0.0', '=', '2.0.0')).toBe(false);
    expect(compareAutoHotkeyVersionByOperator('1.0.0', '<', '2.0.0')).toBe(true);
    expect(compareAutoHotkeyVersionByOperator('1.0.0', '<=', '2.0.0')).toBe(true);
    expect(compareAutoHotkeyVersionByOperator('1.0.0', '>', '2.0.0')).toBe(false);
    expect(compareAutoHotkeyVersionByOperator('1.0.0', '>=', '2.0.0')).toBe(false);

    expect(compareAutoHotkeyVersionByOperator('2.0.0', '=', '1.0.0')).toBe(false);
    expect(compareAutoHotkeyVersionByOperator('2.0.0', '<', '1.0.0')).toBe(false);
    expect(compareAutoHotkeyVersionByOperator('2.0.0', '<=', '1.0.0')).toBe(false);
    expect(compareAutoHotkeyVersionByOperator('2.0.0', '>', '1.0.0')).toBe(true);
    expect(compareAutoHotkeyVersionByOperator('2.0.0', '>=', '1.0.0')).toBe(true);
  });
});
