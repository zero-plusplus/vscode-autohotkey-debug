import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import * as attributes from '../../../../src/client/config/attributes';
import { AttributeTypeError } from '../../../../src/client/config/error';
import { DebugConfig } from '../../../../src/types/dap/config';

describe('env attribute', () => {
  describe('validate', () => {
    test('normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.env.validate ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        env: undefined,
      });
      expect(config.env).toBe(attributes.env.defaultValue);
    });
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.env.validate ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        env: {},
      });
      expect(config.env).toEqual({});
    });
  });

  describe('validate error', () => {
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.env.validate ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        env: [] as unknown as undefined,
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
    });
  });
});
