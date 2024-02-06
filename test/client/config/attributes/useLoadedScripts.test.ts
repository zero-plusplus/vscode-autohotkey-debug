import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { DebugConfig } from '../../../../src/types/dap/config';
import { AttributeTypeError } from '../../../../src/client/config/error';
import * as attributes from '../../../../src/client/config/attributes';

describe('useLoadedScripts attribute', () => {
  describe('validate', () => {
    test('normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useLoadedScripts.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        useLoadedScripts: true,
      });
      expect(config.useLoadedScripts).toBe(attributes.useLoadedScripts.defaultValue);
    });
    test('normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useLoadedScripts.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        useLoadedScripts: undefined,
      });
      expect(config.useLoadedScripts).toBe(attributes.useLoadedScripts.defaultValue);
    });
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useLoadedScripts.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        useLoadedScripts: { scanImplicitLibrary: false },
      });
      expect(config.useLoadedScripts).toEqual({ scanImplicitLibrary: false });
    });
  });

  describe('validate error', () => {
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useLoadedScripts.validator ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        useLoadedScripts: '' as unknown as boolean,
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
    });
  });
});
