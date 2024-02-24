import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { TemporaryResource, createTempDirectoryWithFile } from '../../../../src/tools/temp';
import { utf8BomText } from '../../../../src/tools/utils/checkUtf8WithBom';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { AttributeTypeError, AttributeWarningError } from '../../../../src/client/config/error';

describe(`runtimeArgs attribute`, () => {
  let tempUtf8: TemporaryResource;
  let tempUtf8WithBom: TemporaryResource;
  beforeAll(async() => {
    const text = 'foo';
    tempUtf8 = await createTempDirectoryWithFile('utf8-with-bom', '.ahk', text);
    tempUtf8WithBom = await createTempDirectoryWithFile('utf8-with-bom', '.ahk', `${utf8BomText}${text}`);
  });
  afterAll(() => {
    tempUtf8.cleanup();
    tempUtf8WithBom.cleanup();
  });

  describe('validate', () => {
    test('default with bom', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.program.validator, attributes.runtimeArgs.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(tempUtf8WithBom.path),
        runtimeArgs: undefined,
      });
      expect(config.runtimeArgs).toEqual(attributes.runtimeArgs.defaultValueByUtf8WithBom);
    });
    test('default without bom', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.program.validator, attributes.runtimeArgs.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(tempUtf8.path),
        runtimeArgs: undefined,
      });
      expect(config.runtimeArgs).toEqual(attributes.runtimeArgs.defaultValue);
    });
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.runtimeArgs.validator ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        runtimeArgs: [ 'abc' ],
      });
      expect(config.runtimeArgs).toEqual([ 'abc' ]);
    });
  });

  describe('validate error', () => {
    test('warning', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.runtimeArgs.validator ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        runtimeArgs: [ true as unknown as string, false as unknown as string ],
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeWarningError);
    });
    test('type error', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.runtimeArgs.validator ]);

      const config: DebugConfig = {
        ...createDefaultDebugConfig(''),
        runtimeArgs: false as unknown as string[],
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeTypeError);
    });
  });
});
