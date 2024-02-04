import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import * as attributes from '../../../../src/client/config/attributes';
import { DebugConfig } from '../../../../src/types/dap/config';
import { AttributeTypeError, AttributeWarningError } from '../../../../src/client/config/error';

describe('port attribute', () => {
  describe('validate', () => {
    test('default', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.port.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        port: undefined,
      });
      expect(config.port).toBe(attributes.port.defaultValue);
    });
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.port.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        port: 9002,
      });
      expect(config.port).toBe(9002);
    });
    test('string-format port', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.port.validator ], { warning: async(): Promise<void> => Promise.resolve() });

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        port: '9002' as unknown as number,
      });
      expect(config.port).toBe(9002);
    });
    test('first-end format port', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.port.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        port: '9002-9010',
      });
      expect(config.port).toBe(9002);
    });
  });

  describe('validate error', () => {
    test('warning', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.port.validator ]);

      const config = {
        ...createDefaultDebugConfig(''),
        port: '9002' as unknown as number,
      };
      await expect(validateDebugConfig(config)).rejects.toThrowError(AttributeWarningError);
    });
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.name.validator ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        name: false as unknown as string,
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
    });
  });
});
