import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { DebugConfig } from '../../../../src/types/dap/config';
import { AttributeTypeError, AttributeWarningError } from '../../../../src/client/config/error';
import { validateTypeAttribute } from '../../../../src/client/config/attributes/type';

describe('type attribute', () => {
  const errorHandler = (err: Error): void => {
    throw err;
  };
  describe('validate', () => {
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ validateTypeAttribute ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        type: 'autohotkey',
      }, errorHandler);
      expect(config.type).toBe('autohotkey');
    });
  });

  describe('validate error', () => {
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
});
