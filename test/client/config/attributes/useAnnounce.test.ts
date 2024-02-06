import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { DebugConfig } from '../../../../src/types/dap/config';
import { AttributeTypeError, AttributeValueError } from '../../../../src/client/config/error';
import * as attributes from '../../../../src/client/config/attributes';

describe('useAnnounce attribute', () => {
  describe('validate', () => {
    test('normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useAnnounce.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        useAnnounce: false,
      });
      expect(config.useAnnounce).toBe(attributes.useAnnounce.defaultValue);
    });
    test('normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useAnnounce.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        useAnnounce: undefined,
      });
      expect(config.useAnnounce).toBe(attributes.useAnnounce.defaultValue);
    });
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useAnnounce.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        useAnnounce: 'develop',
      });
      expect(config.useAnnounce).toBe('develop');
    });
  });

  describe('validate error', () => {
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useAnnounce.validator ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        useAnnounce: [] as unknown as boolean,
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
    });
    test('value error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useAnnounce.validator ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        useAnnounce: '' as unknown as boolean,
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeValueError);
    });
  });
});
