import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../src/client/config/default';
import { DebugConfig } from '../../../src/types/dap/config';
import { AttributeFileNotFoundError, AttributeTypeError, AttributeWarningError } from '../../../src/client/config/error';
import { createAttributesValidator } from '../../../src/client/config/validator';
import { validateNameAttribute } from '../../../src/client/config/attributes/name';
import { validateProgramAttribute } from '../../../src/client/config/attributes/program';
import { TemporaryResource, createTempDirectoryWithFile } from '../../../src/tools/temp';
import { validateTypeAttribute } from '../../../src/client/config/attributes/type';
import { validateRuntimeAttribute } from '../../../src/client/config/attributes/runtime';
import { defaultAutoHotkeyRuntimePath_v1 } from '../../../src/tools/autohotkey';

describe('config', () => {
  let temp: TemporaryResource;
  const errorHandler = (err: Error): void => {
    throw err;
  };
  beforeAll(async() => {
    temp = await createTempDirectoryWithFile('type-attribute', '.ahk', ``);
  });
  afterAll(() => {
    temp.cleanup();
  });

  describe('validate', () => {
    test('name', async() => {
      const validateDebugConfig = createAttributesValidator([ validateNameAttribute ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        name: '',
      }, errorHandler);
      expect(config.name).toBe('');
    });
    test('type', async() => {
      const validateDebugConfig = createAttributesValidator([ validateTypeAttribute ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        type: 'autohotkey',
      }, errorHandler);
      expect(config.type).toBe('autohotkey');
    });
    test('program', async() => {
      const validateDebugConfig = createAttributesValidator([ validateProgramAttribute ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        program: temp.path,
      }, errorHandler);
      expect(config.program).toBe(temp.path);
    });
    describe('runtime', () => {
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
  });

  describe('validate error', () => {
    describe('name', () => {
      test('type error', async() => {
        const validateDebugConfig = createAttributesValidator([ validateNameAttribute ]);

        const config: DebugConfig = {
          ...createDefaultDebugConfig(''),
          name: false as unknown as string,
        };
        await expect(validateDebugConfig(config, errorHandler)).rejects.toThrow(AttributeTypeError);
      });
    });
    describe('type', () => {
      test('warning', async() => {
        const validateDebugConfig = createAttributesValidator([ validateTypeAttribute ]);

        const config: DebugConfig = {
          ...createDefaultDebugConfig(''),
          type: '',
        };
        await expect(validateDebugConfig(config, errorHandler)).rejects.toThrow(AttributeWarningError);
      });
      test('type error', async() => {
        const validateDebugConfig = createAttributesValidator([ validateTypeAttribute ]);

        const config: DebugConfig = {
          ...createDefaultDebugConfig(''),
          type: false as unknown as string,
        };
        await expect(validateDebugConfig(config, errorHandler)).rejects.toThrow(AttributeTypeError);
      });
    });
    test('program', async() => {
      const validateDebugConfig = createAttributesValidator([ validateProgramAttribute ]);

      const config = {
        ...createDefaultDebugConfig(''),
        program: '',
      };
      await expect(validateDebugConfig(config, errorHandler)).rejects.toThrow(AttributeFileNotFoundError);
    });
    test('runtime', async() => {
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
