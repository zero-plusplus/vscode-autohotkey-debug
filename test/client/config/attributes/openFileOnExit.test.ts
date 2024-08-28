import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';

describe('openFileOnExit', () => {
  const schema = createSchema(object<Partial<DebugConfig>>({
    openFileOnExit: attributes.openFileOnExit.attributeRule,
  }).normalizeProperties({ openFileOnExit: attributes.openFileOnExit.attributeNormalizer }));

  test('pass', async() => {
    await expect(schema.apply({ openFileOnExit: __filename })).resolves.toEqual({ openFileOnExit: __filename });
    await expect(schema.apply({ openFileOnExit: undefined })).resolves.toEqual({ openFileOnExit: undefined });
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ openFileOnExit: 'abc' })).rejects.toThrow(),
    );
    test(
      'Failure if directory',
      async() => expect(schema.apply({ openFileOnExit: __dirname })).rejects.toThrow(),
    );
  });
});
