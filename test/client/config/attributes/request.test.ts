import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('request', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'request'>>({
    request: attributes.request.attributeRule,
  }).normalizeProperties({ request: attributes.request.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specify `"launch"`',
      async() => expect(schema.apply({ request: 'launch' })).resolves.toEqual({ request: 'launch' }),
    );
    test(
      'Specify `"attach"`',
      async() => expect(schema.apply({ request: 'attach' })).resolves.toEqual({ request: 'attach' }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ request: {} })).rejects.toThrow(),
    );
  });
});
