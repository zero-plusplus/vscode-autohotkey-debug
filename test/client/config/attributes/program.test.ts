import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { createDefaultDebugConfig } from '../../../../src/client/config/default';
import { createAttributesValidator } from '../../../../src/client/config/validator';
import { validateProgramAttribute } from '../../../../src/client/config/attributes/program';
import { TemporaryResource, createTempDirectoryWithFile } from '../../../../src/tools/temp';
import { AttributeFileNotFoundError } from '../../../../src/client/config/error';

describe('program attribute', () => {
  let temp: TemporaryResource;
  const errorHandler = (err: Error): void => {
    throw err;
  };
  beforeAll(async() => {
    temp = await createTempDirectoryWithFile('program-attribute', '.ahk', ``);
  });
  afterAll(() => {
    temp.cleanup();
  });

  describe('validate', () => {
    test('non-normalize', async() => {
      const validateDebugConfig = createAttributesValidator([ validateProgramAttribute ]);

      const config = await validateDebugConfig({
        ...createDefaultDebugConfig(''),
        program: temp.path,
      }, errorHandler);
      expect(config.program).toBe(temp.path);
    });
  });

  describe('validate error', () => {
    test('file not found', async() => {
      const validateDebugConfig = createAttributesValidator([ validateProgramAttribute ]);

      const config = {
        ...createDefaultDebugConfig(''),
        program: '',
      };
      await expect(validateDebugConfig(config, errorHandler)).rejects.toThrow(AttributeFileNotFoundError);
    });
  });
});
