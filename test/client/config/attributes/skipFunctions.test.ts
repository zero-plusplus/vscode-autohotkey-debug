import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';

describe('skipFunctions', () => {
  const schema = createSchema(object<Partial<DebugConfig>>({
    skipFunctions: attributes.skipFunctions.attributeRule,
  }).normalizeProperties({ skipFunctions: attributes.skipFunctions.attributeNormalizer }));

  describe('pass', () => {
    test(
      '`skipFunctions` attribute is specified',
      async() => expect(schema.apply({ skipFunctions: [ __filename ] }))
        .resolves.toMatchObject({ skipFunctions: [ __filename ] }),
    );
    test(
      '`skipFunctions` attribute is not specified',
      async() => expect(schema.apply({ skipFunctions: undefined }))
        .resolves.toMatchObject({ skipFunctions: attributes.skipFunctions.defaultValue }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ skipFunctions: '' })).rejects.toThrow(),
    );
  });
});
