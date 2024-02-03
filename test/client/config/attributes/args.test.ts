import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { DebugConfig } from '../../../../src/types/dap/config';
import { AttributeTypeError, AttributeWarningError } from '../../../../src/client/config/error';
import * as attributes from '../../../../src/client/config/attributes';

describe('args attribute', () => {
  describe('validate', () => {
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.args.validate ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        args: [ 'abc' ],
      });
      expect(config.args).toEqual([ 'abc' ]);
    });
  });

  describe('validate error', () => {
    test('warning', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.args.validate ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        args: [ true as unknown as string, false as unknown as string ],
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeWarningError);
    });
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.args.validate ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        args: false as unknown as string[],
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
    });
  });
});
