import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('noDebug', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'noDebug'>>({
    noDebug: attributes.noDebug.attributeRule,
  }).normalizeProperties({ noDebug: attributes.noDebug.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specified `true`',
      async() => expect(schema.apply({ noDebug: true })).resolves.toEqual({ noDebug: true }),
    );
    test(
      'Specified `false`',
      async() => expect(schema.apply({ noDebug: false })).resolves.toEqual({ noDebug: false }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ noDebug: 'abc' })).rejects.toThrow(),
    );
  });
});
