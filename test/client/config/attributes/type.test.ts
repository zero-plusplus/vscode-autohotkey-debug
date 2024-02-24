import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { AttributeTypeError, AttributeWarningError } from '../../../../src/client/config/error';
import * as attributes from '../../../../src/client/config/attributes';

describe('type attribute', () => {
  describe('validate', () => {
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.type.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        type: 'autohotkey',
      });
      expect(config.type).toBe('autohotkey');
    });
  });

  describe('validate error', () => {
    test('warning', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.type.validator ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        type: '',
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeWarningError);
    });
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.type.validator ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        type: false as unknown as string,
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
    });
  });
});
