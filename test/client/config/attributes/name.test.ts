import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { validateNameAttribute } from '../../../../src/client/config/attributes/name';
import { DebugConfig } from '../../../../src/types/dap/config';
import { AttributeTypeError } from '../../../../src/client/config/error';

describe('name attribute', () => {
  const errorHandler = (err: Error): void => {
    throw err;
  };
  describe('validate', () => {
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ validateNameAttribute ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        name: '',
      }, errorHandler);
      expect(config.name).toBe('');
    });
  });

  describe('validate error', () => {
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ validateNameAttribute ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        name: false as unknown as string,
      };
      await expect(validateDebugConfig(config, errorHandler)).rejects.toThrow(AttributeTypeError);
    });
  });
});
