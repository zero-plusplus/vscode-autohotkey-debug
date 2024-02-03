import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import * as attributes from '../../../../src/client/config/attributes';
import { DebugConfig } from '../../../../src/types/dap/config';
import { AttributeTypeError } from '../../../../src/client/config/error';

describe('hostname attribute', () => {
  describe('validate', () => {
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.hostname.validate ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        hostname: 'localhost',
      });
      expect(config.hostname).toBe(attributes.hostname.defaultValue);
    });
    test('normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.hostname.validate ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        hostname: undefined,
      });
      expect(config.hostname).toBe(attributes.hostname.defaultValue);
    });
  });

  describe('validate error', () => {
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.hostname.validate ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        hostname: false as unknown as string,
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
    });
  });
});
