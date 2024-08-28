import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('useAutoJumpToError', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'useAutoJumpToError'>>({
    useAutoJumpToError: attributes.useAutoJumpToError.attributeRule,
  }).normalizeProperties({ useAutoJumpToError: attributes.useAutoJumpToError.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specified `true`',
      async() => expect(schema.apply({ useAutoJumpToError: true })).resolves.toEqual({ useAutoJumpToError: true }),
    );
    test(
      'Specified `false`',
      async() => expect(schema.apply({ useAutoJumpToError: false })).resolves.toEqual({ useAutoJumpToError: false }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ useAutoJumpToError: 'abc' })).rejects.toThrow(),
    );
  });
});
