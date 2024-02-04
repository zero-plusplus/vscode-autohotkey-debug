import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../../src/client/config/validator';
import { AttributeValidator, DebugConfig } from '../../../../../src/types/dap/config';
import { AttributeTypeError, AttributeWarningError } from '../../../../../src/client/config/error';

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
        expect(config[attributeName]).toEqual(defaultValue);
      });
      test('non-normalize', async() => {
        const validateDebugConfig = createAttributesValidator(validators);

        const config = await validateDebugConfig({
          ...createDefaultDebugConfig(''),
          [attributeName]: [ 'abc' ],
        });
        expect(config[attributeName]).toEqual([ 'abc' ]);
      });
    });

    describe('validate error', () => {
      test('warning', async() => {
        const validateDebugConfig = createAttributesValidator(validators);

        const config: DebugConfig = {
          ...createDefaultDebugConfig(''),
          [attributeName]: [ true as unknown as string, false as unknown as string ],
        };
        await expect(validateDebugConfig(config)).rejects.toThrow(AttributeWarningError);
      });
      test('type error', async() => {
        const validateDebugConfig = createAttributesValidator(validators);

        const config: DebugConfig = {
          ...createDefaultDebugConfig(''),
          [attributeName]: false as unknown as string[],
        };
        await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
      });
    });
  });
};
