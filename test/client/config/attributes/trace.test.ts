import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('trace', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'trace'>>({
    trace: attributes.trace.attributeRule,
  }).normalizeProperties({ trace: attributes.trace.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specified `true`',
      async() => expect(schema.apply({ trace: true })).resolves.toEqual({ trace: true }),
    );
    test(
      'Specified `false`',
      async() => expect(schema.apply({ trace: false })).resolves.toEqual({ trace: false }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ trace: 'abc' })).rejects.toThrow(),
    );
  });
});
