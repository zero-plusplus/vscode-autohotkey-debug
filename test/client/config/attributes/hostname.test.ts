import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('hostname', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'hostname'>>({
    hostname: attributes.hostname.attributeRule,
  }).normalizeProperties({ hostname: attributes.hostname.attributeNormalizer }));

  test('pass', async() => {
    await expect(schema.apply({ hostname: '127.0.0.1' })).resolves.toEqual({ hostname: '127.0.0.1' });
    await expect(schema.apply({ hostname: 'localhost' })).resolves.toEqual({ hostname: '127.0.0.1' });
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ hostname: {} })).rejects.toThrow(),
    );
  });
});
