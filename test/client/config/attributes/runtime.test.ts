import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { AttributeFileNotFoundError } from '../../../../src/client/config/error';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { validateProgramAttribute } from '../../../../src/client/config/attributes/program';
import { TemporaryResource, createTempDirectoryWithFile } from '../../../../src/tools/temp';
import { validateRuntimeAttribute } from '../../../../src/client/config/attributes/runtime';
import { defaultAutoHotkeyRuntimePath_v1 } from '../../../../src/tools/autohotkey';

describe('runtime attribute', () => {
  let temp: TemporaryResource;
  const errorHandler = (err: Error): void => {
    throw err;
  };
  beforeAll(async() => {
    temp = await createTempDirectoryWithFile('runtime-attribute', '.ahk', ``);
  });
  afterAll(() => {
    temp.cleanup();
  });

  describe('validate', () => {
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ validateProgramAttribute, validateRuntimeAttribute ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        program: temp.path,
        runtime: defaultAutoHotkeyRuntimePath_v1,
      }, errorHandler);
      expect(config.runtime).toBe(defaultAutoHotkeyRuntimePath_v1);
    });
    test('relative path', async() => {
      const validateDebugConfig = createAttributesValidator([ validateProgramAttribute, validateRuntimeAttribute ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        program: temp.path,
        runtime: 'AutoHotkey.exe',
      }, errorHandler);
      expect(config.runtime).toBe(defaultAutoHotkeyRuntimePath_v1);
    });
  });

  describe('validate error', () => {
    test('file not found', async() => {
      const validateDebugConfig = createAttributesValidator([ validateProgramAttribute, validateRuntimeAttribute ]);

      const config = {
        ...createDefaultDebugConfig(''),
        process: temp.path,
        runtime: '',
      };
      await expect(validateDebugConfig(config, errorHandler)).rejects.toThrow(AttributeFileNotFoundError);
    });
  });
});
