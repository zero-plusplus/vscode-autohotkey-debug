import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { asString, createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('runtime', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'runtime'>>({
    runtime: asString(attributes.runtime.attributeRule),
  }).normalizeProperties({ runtime: attributes.runtime.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specify file path for `runtime` attribute',
      async() => expect(schema.apply({ runtime: __filename })).resolves.toEqual({ runtime: __filename }),
    );
    test(
      '`runtime` attribute is not specified and `runtime_v1` attribute is specified',
      async() => expect(schema.apply({ runtime: undefined, runtime_v1: __filename })).resolves.toEqual({ runtime: __filename }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ runtime: {} })).rejects.toThrow(),
    );
  });
});
