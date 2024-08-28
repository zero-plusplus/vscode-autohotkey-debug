import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('port', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'port'>>({
    port: attributes.port.attributeRule,
  }).normalizeProperties({ port: attributes.port.attributeNormalizer }));

  test('pass', async() => {
    await expect(schema.apply({ port: 9050 })).resolves.toEqual({ port: 9050 });
    await expect(schema.apply({ port: [ 9050 ] })).resolves.toEqual({ port: 9050 });
    await expect(schema.apply({ port: '9050-9100' })).resolves.toEqual({ port: 9050 });
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ port: 'abc' })).rejects.toThrow(),
    );
  });
});
