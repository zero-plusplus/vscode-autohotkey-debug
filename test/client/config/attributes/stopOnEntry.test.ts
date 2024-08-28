import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('stopOnEntry', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'stopOnEntry'>>({
    stopOnEntry: attributes.stopOnEntry.attributeRule,
  }).normalizeProperties({ stopOnEntry: attributes.stopOnEntry.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specified `true`',
      async() => expect(schema.apply({ stopOnEntry: true })).resolves.toEqual({ stopOnEntry: true }),
    );
    test(
      'Specified `false`',
      async() => expect(schema.apply({ stopOnEntry: false })).resolves.toEqual({ stopOnEntry: false }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ stopOnEntry: 'abc' })).rejects.toThrow(),
    );
  });
});
