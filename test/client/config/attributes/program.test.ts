import * as path from 'path';
import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { asString, createSchema, object, string } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('program', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'program'>>({
    program: asString(attributes.program.attributeRule),
    runtime: attributes.runtime.attributeRule.optional(),
    __filename: string().optional().immediate(),
  }).normalizeProperties({ program: attributes.program.attributeNormalizer }));

  describe('pass', () => {
    test(
      '`program` attribute is specified',
      async() => expect(schema.apply({ program: __filename, runtime: __filename }))
        .resolves.toEqual({ program: __filename, runtime: __filename }),
    );
    test(
      '`program` attribute is not specified and `__filename` attribute is specified',
      async() => expect(schema.apply({ program: undefined, __filename }))
        .resolves.toEqual({ program: __filename, __filename }),
    );
    test(
      '`program` attribute is not specified and `runtime` attribute is specified',
      async() => expect(schema.apply({ program: undefined, runtime: __filename }))
        .resolves.toMatchObject({ program: path.resolve(__dirname, `${path.basename(__filename, path.extname(__filename))}.ahk`) }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ program: {} })).rejects.toThrow(),
    );
  });
});
