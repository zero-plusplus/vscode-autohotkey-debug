import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('useIntelliSenseInDebugging', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'useIntelliSenseInDebugging'>>({
    useIntelliSenseInDebugging: attributes.useIntelliSenseInDebugging.attributeRule,
  }).normalizeProperties({ useIntelliSenseInDebugging: attributes.useIntelliSenseInDebugging.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specified `true`',
      async() => expect(schema.apply({ useIntelliSenseInDebugging: true })).resolves.toEqual({ useIntelliSenseInDebugging: true }),
    );
    test(
      'Specified `false`',
      async() => expect(schema.apply({ useIntelliSenseInDebugging: false })).resolves.toEqual({ useIntelliSenseInDebugging: false }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ useIntelliSenseInDebugging: 'abc' })).rejects.toThrow(),
    );
  });
});
