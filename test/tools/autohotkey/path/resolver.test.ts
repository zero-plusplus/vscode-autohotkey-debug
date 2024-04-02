import * as path from 'path';
import * as fs from 'fs';
import { beforeEach, describe, expect, test } from '@jest/globals';
import { createPathResolver } from '../../../../src/tools/autohotkey/path/resolver';
import { TemporaryResource, createTempDirectory } from '../../../../src/tools/temp';
import { afterEach } from 'node:test';
import { AutoHotkeyEnvironmentName } from '../../../../src/types/tools/autohotkey/path/resolver.types';

describe('resolver', () => {
  let testDir: TemporaryResource;
  const createFile = (relativePath: string): string => {
    const filePath = path.resolve(testDir.path, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '', 'utf-8');
    return filePath;
  };
  beforeEach(async() => {
    testDir = await createTempDirectory('path-resolver');
  });
  afterEach(() => {
    testDir.cleanup();
  });

  describe('v1', () => {
    test('set/get Env', () => {
      const targetKey: AutoHotkeyEnvironmentName = 'A_UserName';
      const defaultUserName = 'ABC';
      const overwriteUserName = 'OverWrite';
      const resolver = createPathResolver('1.0.0', { [targetKey]: defaultUserName });

      resolver.setEnv(targetKey, overwriteUserName, false);
      expect(resolver.getEnv(targetKey)).toBe(defaultUserName);

      resolver.setEnv(targetKey, overwriteUserName);
      expect(resolver.getEnv(targetKey)).toBe(overwriteUserName);
    });
    test('cwd', () => {
      const mainPath = createFile('ABC.ahk');
      const resolver = createPathResolver('1.0.0');
      resolver.resolve(testDir.path);

      const resolved = resolver.resolve(`.\\ABC.ahk`);
      expect(resolved).toBe(mainPath);
    });
    test('variable', () => {
      const mainPath = createFile('ABC.ahk');
      const resolver = createPathResolver('1.0.0', { A_UserName: 'ABC' });
      const resolved = resolver.resolve(`${testDir.path}\\%A_UserName%.ahk`);
      expect(resolved).toBe(mainPath);
    });
    test('A_LineFile', () => {
      const mainPath = createFile('main.ahk');
      const resolver = createPathResolver('1.0.0', { A_LineFile: mainPath });

      const subPath = createFile('sub.ahk');
      const includePath = '%A_LineFile%/../sub.ahk';
      const resolved = resolver.resolve(includePath);
      expect(resolved).toBe(subPath);
    });
    test('relative', () => {
      const mainPath = createFile('main.ahk');
      const resolver = createPathResolver('1.0.0', { A_LineFile: mainPath });

      const subPath = createFile('sub.ahk');
      const includePath = './sub.ahk';
      const resolved = resolver.resolve(includePath);
      expect(resolved).toBe(subPath);
    });
    test('standard library', () => {
      const mainPath = createFile('main.ahk');
      const resolver = createPathResolver('1.0.0', { A_LineFile: mainPath, A_ScriptDir: path.dirname(mainPath) });

      const subPath = createFile('lib/Foo.ahk');
      const includePath = '<Foo>';
      const resolved = resolver.resolve(includePath);
      expect(resolved?.toLowerCase()).toBe(subPath.toLowerCase());
    });
  });
});
