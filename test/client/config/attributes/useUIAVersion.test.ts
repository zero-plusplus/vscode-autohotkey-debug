import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('useUIAVersion', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'useUIAVersion'>>({
    useUIAVersion: attributes.useUIAVersion.attributeRule,
  }).normalizeProperties({ useUIAVersion: attributes.useUIAVersion.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specified `true`',
      async() => expect(schema.apply({ useUIAVersion: true })).resolves.toEqual({ useUIAVersion: true }),
    );
    test(
      'Specified `false`',
      async() => expect(schema.apply({ useUIAVersion: false })).resolves.toEqual({ useUIAVersion: false }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ useUIAVersion: 'abc' })).rejects.toThrow(),
    );
  });
});
