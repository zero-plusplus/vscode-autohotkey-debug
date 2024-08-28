import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';

describe('env', () => {
  const schema = createSchema(object<Partial<DebugConfig>>({
    env: attributes.env.attributeRule,
  }).normalizeProperties({ env: attributes.env.attributeNormalizer }));

  test('pass', async() => {
    await expect(schema.apply({ env: { a: 'a', b: __filename, c: undefined } })).resolves.toEqual({ env: { a: 'a', b: __filename, c: undefined } });
    await expect(schema.apply({ env: undefined })).resolves.toEqual({ env: undefined });
  });
  test('warning', async() => {
    await expect(schema.apply({ env: { a: 'a', b: {} } })).resolves.toEqual({ env: { a: 'a' } });
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ env: 'abc' })).rejects.toThrow(),
    );
  });
});
