import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('name', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'name'>>({
    name: attributes.name.attributeRule,
  }).normalizeProperties({ name: attributes.name.attributeNormalizer }));

  test('pass', async() => {
    await expect(schema.apply({ name: 'AutoHotkey Debug' })).resolves.toEqual({ name: 'AutoHotkey Debug' });
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ name: {} })).rejects.toThrow(),
    );
  });
});
