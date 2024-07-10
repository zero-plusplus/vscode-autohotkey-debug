import { describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { AttributeTypeError } from '../../../../src/client/config/error';
import * as attributes from '../../../../src/client/config/attributes';

describe('useDebugDirective attribute', () => {
  describe('validate', () => {
    test('normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useDebugDirective.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        useDebugDirective: true,
      });
      expect(config.useDebugDirective).toBe(attributes.useDebugDirective.normalizedDefaultValue);
    });
    test('normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useDebugDirective.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        useDebugDirective: { useBreakpointDirective: true, useClearConsoleDirective: true, useOutputDirective: true },
      });
      expect(config.useDebugDirective).toEqual({ useBreakpointDirective: true, useClearConsoleDirective: true, useOutputDirective: true });
    });
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useDebugDirective.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        useDebugDirective: false,
      });
      expect(config.useDebugDirective).toBe(attributes.useDebugDirective.defaultValue);
    });
  });

  describe('validate error', () => {
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.useDebugDirective.validator ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        useDebugDirective: '' as unknown as boolean,
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
    });
  });
});
