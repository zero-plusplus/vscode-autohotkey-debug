import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../../src/client/config/validator';
import { AttributeValidator, DebugConfig } from '../../../../../src/types/dap/config.types';
import { AttributeFileNotFoundError, AttributeTypeError } from '../../../../../src/client/config/error';

export const createTest = (attributeName: string, defaultValue: any, validatorOrValidators: AttributeValidator | AttributeValidator[]): void => {
  const validators = Array.isArray(validatorOrValidators) ? validatorOrValidators : [ validatorOrValidators ];

  describe(`${attributeName} attribute`, () => {
    describe('validate', () => {
      test('normalize', async() => {
        const validateDebugConfig = createAttributesValidator(validators);

        const config = await validateDebugConfig({
          ...createDefaultDebugConfig(''),
          [attributeName]: undefined,
        });
        expect(config[attributeName]).toBe(defaultValue);
      });
    });

    describe('validate error', () => {
      test('type error', async() => {
        const validateDebugConfig = createAttributesValidator(validators);

        const config: DebugConfig = {
          ...createDefaultDebugConfig(''),
          [attributeName]: false as unknown as string,
        };
        await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
      });
      test('file not found error', async() => {
        const validateDebugConfig = createAttributesValidator(validators);

        const config: DebugConfig = {
          ...createDefaultDebugConfig(''),
          [attributeName]: '',
        };
        await expect(validateDebugConfig(config)).rejects.toThrow(AttributeFileNotFoundError);
      });
    });
  });
};
