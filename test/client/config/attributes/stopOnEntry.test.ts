import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { DebugConfig } from '../../../../src/types/dap/config';
import { AttributeTypeError } from '../../../../src/client/config/error';
import * as attributes from '../../../../src/client/config/attributes';

describe('stopOnEntry attribute', () => {
  describe('validate', () => {
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.stopOnEntry.validate ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        stopOnEntry: true,
      });
      expect(config.stopOnEntry).toBe(true);
    });
  });

  describe('validate error', () => {
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.stopOnEntry.validate ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        stopOnEntry: '' as unknown as boolean,
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
    });
  });
});
