import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { DebugConfig } from '../../../../src/types/dap/config';
import { AttributeTypeError } from '../../../../src/client/config/error';
import * as attributes from '../../../../src/client/config/attributes';

describe('usePerfTips attribute', () => {
  describe('validate', () => {
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.usePerfTips.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        usePerfTips: false,
      });
      expect(config.usePerfTips).toBe(attributes.usePerfTips.defaultValue);
    });
    test('normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.usePerfTips.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        usePerfTips: undefined,
      });
      expect(config.usePerfTips).toBe(attributes.usePerfTips.defaultValue);
    });
    test('normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.usePerfTips.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        usePerfTips: true,
      });
      expect(config.usePerfTips).toBe(attributes.usePerfTips.recommendValue);
    });
  });

  describe('validate error', () => {
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.usePerfTips.validator ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        usePerfTips: '' as unknown as boolean,
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
    });
  });
});
