import * as path from 'path';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { createPathResolver } from '../../../../src/tools/autohotkey/path/resolver';
import { TemporaryResource, createTempDirectory } from '../../../../src/tools/temp';

describe('resolver', () => {
  let testDir: TemporaryResource;
  beforeAll(async() => {
    testDir = await createTempDirectory('path-resolver');
  });
  afterAll(() => {
    testDir.cleanup();
  });

  describe('v1', () => {
    test('variable', () => {
      const resolver = createPathResolver('1.0.0', { A_UserName: 'ABC' });
      const resolved = resolver.resolve(`${testDir.path}\\%A_UserName%.ahk`);
      expect(resolved).toBe(path.resolve(testDir.path, 'ABC.ahk'));
    });
    test('A_LineFile', () => {
      const mainPath = path.resolve(testDir.path, 'main.ahk');
      const resolver = createPathResolver('1.0.0', { A_LineFile: mainPath });

      const includePath = '%A_LineFile%/../sub.ahk';
      const resolved = resolver.resolve(includePath);
      expect(resolved).toBe(path.resolve(testDir.path, 'sub.ahk'));
    });
    test('relative', () => {
      const mainPath = path.resolve(testDir.path, 'main.ahk');
      const resolver = createPathResolver('1.0.0', { A_LineFile: mainPath });

      const includePath = './sub.ahk';
      const resolved = resolver.resolve(includePath);
      expect(resolved).toBe(path.resolve(testDir.path, 'sub.ahk'));
    });
  });
});
