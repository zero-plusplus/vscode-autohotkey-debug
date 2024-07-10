import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { VariableCategory } from '../../../../src/types/dap/variableCategory.types';
import { AttributeTypeError, AttributeValueError } from '../../../../src/client/config/error';

describe('variableCategories attribute', () => {
  describe('validate', () => {
    test('recommended', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.variableCategories.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        variableCategories: 'recommend',
      });
      expect(config.variableCategories).toBe(attributes.variableCategories.normalizedDefaultValue);
    });
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.variableCategories.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        variableCategories: undefined,
      });
      expect(config.variableCategories).toBe(attributes.variableCategories.defaultValue);
    });
  });

  describe('validate error', () => {
    test('value error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.variableCategories.validator ]);

      const config = {
        ...createDefaultDebugConfig(''),
        variableCategories: '' as unknown as VariableCategory[],
      };
      await expect(validateDebugConfig(config)).rejects.toThrowError(AttributeValueError);
    });
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.variableCategories.validator ]);

      const config = {
        ...createDefaultDebugConfig(''),
        variableCategories: {} as unknown as VariableCategory[],
      };
      await expect(validateDebugConfig(config)).rejects.toThrowError(AttributeTypeError);
    });
  });
});
