import { describe, expect, test, xdescribe } from '@jest/globals';
import { compareAutoHotkeyVersion, defaultAutoHotkeyRuntimePath_v1, defaultAutoHotkeyRuntimePath_v2, evaluateAhkVersion, parseAutoHotkeyVersion } from '../../../src/tools/autohotkey';
import { AutoHotkeyVersion, ParsedAutoHotkeyVersion } from '../../../src/types/tools/autohotkey/version/common.types';

describe('version', () => {
  describe('parseAutoHotkeyVersion', () => {
    test('v1', () => {
      const version = '1.1.31.00';
      expect(parseAutoHotkeyVersion('1.1.31.00')).toEqual({
        raw: version,
        version,
        mejor: 1.1,
        minor: 31,
        patch: 0,
      } as ParsedAutoHotkeyVersion);
    });
    test('v2', () => {
      const version = '2.0.0';
      expect(parseAutoHotkeyVersion(version)).toEqual({
        raw: version,
        version,
        mejor: 2,
        minor: 0,
        patch: 0,
      } as ParsedAutoHotkeyVersion);
    });
    test('invalid version', () => {
      const version = 'a.b.c' as AutoHotkeyVersion;
      expect(parseAutoHotkeyVersion(version)).toEqual({
        raw: version,
        version,
        mejor: -1,
        minor: -1,
        patch: -1,
      } as ParsedAutoHotkeyVersion);
    });
    test('alpha', () => {
      const version = '2.0.0';
      const preversion = 'alpha.1';
      const raw = `${version}-${preversion}`;
      expect(parseAutoHotkeyVersion(raw)).toEqual({
        raw,
        version,
        preversion,
        mejor: 2,
        minor: 0,
        patch: 0,
        preId: 'alpha',
        preRelease: 1,
      } as ParsedAutoHotkeyVersion);
    });
    test('beta', () => {
      const version = '2.0.0';
      const preversion = 'beta.10';
      const raw = `${version}-${preversion}`;
      expect(parseAutoHotkeyVersion(raw)).toEqual({
        raw,
        version,
        preversion,
        mejor: 2,
        minor: 0,
        patch: 0,
        preId: 'beta',
        preRelease: 10,
      } as ParsedAutoHotkeyVersion);
    });
    test('rc', () => {
      const version = '2.0.0';
      const preversion = 'rc.2';
      const raw = `${version}-${preversion}`;
      expect(parseAutoHotkeyVersion(raw)).toEqual({
        raw,
        version,
        preversion,
        mejor: 2,
        minor: 0,
        patch: 0,
        preId: 'rc',
        preRelease: 2,
      } as ParsedAutoHotkeyVersion);
    });
  });

  describe('compareAutoHotkeyVersion', () => {
    test('sort', () => {
      const versions: AutoHotkeyVersion[] = [
        '2.0.0',
        '1.1.30.0',
        '2.0.0-rc.1',
        '2.1.0',
        '1.1.30.1',
        '2.0.0-beta.1',
        '2.1.0-alpha.1',
        '2.0.0-alpha.1',
      ];
      const sortedVersions = versions.sort((a, b) => compareAutoHotkeyVersion(parseAutoHotkeyVersion(a), parseAutoHotkeyVersion(b)));
      expect(sortedVersions).toEqual([
        '1.1.30.0',
        '1.1.30.1',
        '2.0.0-alpha.1',
        '2.0.0-beta.1',
        '2.0.0-rc.1',
        '2.0.0',
        '2.1.0-alpha.1',
        '2.1.0',
      ]);
    });
    test('==', () => {
      const version = '1.1.30.00';
      const a = parseAutoHotkeyVersion(version);
      const b = parseAutoHotkeyVersion(version);
      expect(compareAutoHotkeyVersion(a, b)).toBe(0);
    });
    test('<', () => {
      const a = parseAutoHotkeyVersion('1.1.30.00');
      const b = parseAutoHotkeyVersion('2.0.0');
      expect(compareAutoHotkeyVersion(a, b)).toBeLessThan(0);
    });
    test('>', () => {
      const a = parseAutoHotkeyVersion('2.0.0');
      const b = parseAutoHotkeyVersion('1.1.30.00');
      expect(compareAutoHotkeyVersion(a, b)).toBeGreaterThan(0);
    });
  });

  xdescribe('Costly testing', () => {
    test('evaluateAhkVersion', () => {
      expect(evaluateAhkVersion(defaultAutoHotkeyRuntimePath_v1)).toBeTruthy();
      expect(evaluateAhkVersion(defaultAutoHotkeyRuntimePath_v2)).toBeTruthy();
      expect(evaluateAhkVersion('')).toBeFalsy();
    });
  });
});
