import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('useLoadedScripts', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'useLoadedScripts'>>({
    useLoadedScripts: attributes.useLoadedScripts.attributeRule,
  }).normalizeProperties({ useLoadedScripts: attributes.useLoadedScripts.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specified `true`',
      async() => expect(schema.apply({ useLoadedScripts: true })).resolves.toEqual({ useLoadedScripts: true }),
    );
    test(
      'Specified `false`',
      async() => expect(schema.apply({ useLoadedScripts: false })).resolves.toEqual({ useLoadedScripts: false }),
    );
    test(
      'Specified object',
      async() => expect(schema.apply({ useLoadedScripts: { scanImplicitLibrary: false } }))
        .resolves.toEqual({ useLoadedScripts: { scanImplicitLibrary: false } }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ useLoadedScripts: 'abc' })).rejects.toThrow(),
    );
  });
});
