import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import * as attributes from '../../../../src/client/config/attributes';
import { DebugConfig } from '../../../../src/types/dap/config';
import { AttributeTypeError } from '../../../../src/client/config/error';

describe('name attribute', () => {
  describe('validate', () => {
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.name.validate ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        name: '',
      });
      expect(config.name).toBe('');
    });
  });

  describe('validate error', () => {
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.name.validate ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        name: false as unknown as string,
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
    });
  });
});
