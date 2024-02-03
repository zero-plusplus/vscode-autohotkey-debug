import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../../src/client/config/validator';
import { AttributeValidator, DebugConfig } from '../../../../../src/types/dap/config';
import { AttributeTypeError } from '../../../../../src/client/config/error';

export const createTest = (attributeName: string, validator: AttributeValidator): void => {
  describe(`${attributeName} attribute`, () => {
    describe('validate', () => {
      test('non-normalize', async() => {
        const validateDebugConfig = createAttributesValidator([ validator ]);

        const config = await validateDebugConfig({
          ...createDefaultDebugConfig(''),
          [attributeName]: '',
        });
        expect(config[attributeName]).toBe('');
      });
    });

    describe('validate error', () => {
      test('type error', async() => {
        const validateDebugConfig = createAttributesValidator([ validator ]);

        const config: DebugConfig = {
          ...createDefaultDebugConfig(''),
          [attributeName]: false as unknown as string,
        };
        await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
      });
    });
  });
};
