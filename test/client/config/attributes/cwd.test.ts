import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';

describe('cwd', () => {
  const schema = createSchema(object<Partial<DebugConfig>>({
    cwd: attributes.cwd.attributeRule,
  }).normalizeProperties({ cwd: attributes.cwd.attributeNormalizer }));

  test('pass', async() => {
    await expect(schema.apply({ cwd: __dirname })).resolves.toEqual({ cwd: __dirname });
    await expect(schema.apply({ cwd: undefined })).resolves.toEqual({ cwd: undefined });
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ cwd: {} })).rejects.toThrow(),
    );
    test(
      'Failure if file name',
      async() => expect(schema.apply({ cwd: __filename })).rejects.toThrow(),
    );
  });
});
