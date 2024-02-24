import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { AttributeTypeError } from '../../../../src/client/config/error';
import * as attributes from '../../../../src/client/config/attributes';

describe('useOutputDebug attribute', () => {
  describe('validate', () => {
    test('normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useOutputDebug.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        useOutputDebug: true,
      });
      expect(config.useOutputDebug).toBe(attributes.useOutputDebug.defaultValue);
    });
    test('normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useDebugDirective.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        useOutputDebug: { category: 'stderr', useTrailingLinebreak: true },
      });
      expect(config.useOutputDebug).toEqual({ category: 'stderr', useTrailingLinebreak: true });
    });
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useOutputDebug.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        useOutputDebug: false,
      });
      expect(config.useOutputDebug).toBe(false);
    });
  });

  describe('validate error', () => {
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useOutputDebug.validator ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        useOutputDebug: '' as unknown as boolean,
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
    });
  });
});
