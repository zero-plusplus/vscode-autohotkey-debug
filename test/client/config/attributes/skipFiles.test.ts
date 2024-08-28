import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';

describe('skipFiles', () => {
  const schema = createSchema(object<Partial<DebugConfig>>({
    skipFiles: attributes.skipFiles.attributeRule,
  }).normalizeProperties({ skipFiles: attributes.skipFiles.attributeNormalizer }));

  describe('pass', () => {
    test(
      '`skipFiles` attribute is specified',
      async() => expect(schema.apply({ skipFiles: [ __filename ] }))
        .resolves.toMatchObject({ skipFiles: [ __filename ] }),
    );
    test(
      '`skipFiles` attribute is not specified',
      async() => expect(schema.apply({ skipFiles: undefined }))
        .resolves.toMatchObject({ skipFiles: attributes.skipFiles.defaultValue }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ skipFiles: '' })).rejects.toThrow(),
    );
  });
});
