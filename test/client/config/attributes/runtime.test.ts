import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { AttributeFileNotFoundError } from '../../../../src/client/config/error';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import * as attributes from '../../../../src/client/config/attributes';
import { TemporaryResource, createTempDirectoryWithFile } from '../../../../src/tools/temp';
import { defaultAutoHotkeyRuntimePath_v1 } from '../../../../src/tools/autohotkey';

describe('runtime attribute', () => {
  let temp: TemporaryResource;
  beforeAll(async() => {
    temp = await createTempDirectoryWithFile('runtime-attribute', '.ahk', ``);
  });
  afterAll(() => {
    temp.cleanup();
  });

  describe('validate', () => {
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.program.validator, attributes.runtime.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        program: temp.path,
        runtime: defaultAutoHotkeyRuntimePath_v1,
      });
      expect(config.runtime).toBe(defaultAutoHotkeyRuntimePath_v1);
    });
    test('relative path', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.program.validator, attributes.runtime.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        program: temp.path,
        runtime: 'AutoHotkey.exe',
      });
      expect(config.runtime).toBe(defaultAutoHotkeyRuntimePath_v1);
    });
  });

  describe('validate error', () => {
    test('file not found', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.program.validator, attributes.runtime.validator ]);

      const config = {
        ...createDefaultDebugConfig(''),
        process: temp.path,
        runtime: '',
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeFileNotFoundError);
    });
  });
});
