import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('type', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'type'>>({
    type: attributes.type.attributeRule,
  }).normalizeProperties({ type: attributes.type.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specify `"autohotkey"`',
      async() => expect(schema.apply({ type: 'autohotkey' }))
        .resolves.toEqual({ type: 'autohotkey' }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ type: {} })).rejects.toThrow(),
    );
  });
});
