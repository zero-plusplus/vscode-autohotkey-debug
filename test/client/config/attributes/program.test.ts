import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import * as attributes from '../../../../src/client/config/attributes';
import { TemporaryResource, createTempDirectoryWithFile } from '../../../../src/tools/temp';
import { AttributeFileNotFoundError } from '../../../../src/client/config/error';

describe('program attribute', () => {
  let temp: TemporaryResource;
  beforeAll(async() => {
    temp = await createTempDirectoryWithFile('program-attribute', '.ahk', ``);
  });
  afterAll(() => {
    temp.cleanup();
  });

  describe('validate', () => {
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.program.validate ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        program: temp.path,
      });
      expect(config.program).toBe(temp.path);
    });
  });

  describe('validate error', () => {
    test('file not found', async() => {
      const validateDebugConfig = createAttributesValidator([ attributes.program.validate ]);

      const config = {
        ...createDefaultDebugConfig(''),
        program: '',
      };
      await expect(validateDebugConfig(config)).rejects.toThrow(AttributeFileNotFoundError);
    });
  });
});
