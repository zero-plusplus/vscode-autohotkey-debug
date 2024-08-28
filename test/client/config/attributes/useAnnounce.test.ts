import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('useAnnounce', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'useAnnounce'>>({
    useAnnounce: attributes.useAnnounce.attributeRule,
  }).normalizeProperties({ useAnnounce: attributes.useAnnounce.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specify `undefined`',
      async() => expect(schema.apply({ useAnnounce: undefined })).resolves.toEqual({ useAnnounce: 'detail' }),
    );
    test(
      'Specify `false`',
      async() => expect(schema.apply({ useAnnounce: false })).resolves.toEqual({ useAnnounce: false }),
    );
    test(
      'Specify `"error"`',
      async() => expect(schema.apply({ useAnnounce: 'error' })).resolves.toEqual({ useAnnounce: 'error' }),
    );
    test(
      'Specify `"detail"`',
      async() => expect(schema.apply({ useAnnounce: 'detail' })).resolves.toEqual({ useAnnounce: 'detail' }),
    );
    test(
      'Specify `"develop"`',
      async() => expect(schema.apply({ useAnnounce: 'develop' })).resolves.toEqual({ useAnnounce: 'develop' }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ useAnnounce: {} })).rejects.toThrow(),
    );
  });
});
