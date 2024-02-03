import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { DebugConfig } from '../../../../src/types/dap/config';
import { AttributeTypeError, AttributeValueError } from '../../../../src/client/config/error';
import { validateRequestAttribute } from '../../../../src/client/config/attributes/request';

describe('request attribute', () => {
  describe('validate', () => {
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ validateRequestAttribute ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        request: 'launch',
      });
      expect(config.request).toBe('launch');
    });
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ validateRequestAttribute ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        request: 'attach',
      });
      expect(config.request).toBe('attach');
    });
  });

  describe('validate error', () => {
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ validateRequestAttribute ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        request: {} as 'launch',
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
    });
    test('value error', async() => {
      const validateDebugConfig = createAttributesValidator([ validateRequestAttribute ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        request: 'abc' as 'launch',
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeValueError);
    });
  });
});
