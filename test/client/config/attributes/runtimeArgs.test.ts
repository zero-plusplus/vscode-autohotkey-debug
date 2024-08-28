import { describe, expect, test } from '@jest/globals';
import * as path from 'path';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('runtimeArgs', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'runtimeArgs' | 'program'>>({
    runtimeArgs: attributes.runtimeArgs.attributeRule,
    program: attributes.program.attributeRule.immediate(),
  }).normalizeProperties({ runtimeArgs: attributes.runtimeArgs.attributeNormalizer }));

  describe('pass', () => {
    test(
      '`runtimeArgs` attribute is not specified and `program` attribute is utf8',
      async() => expect(schema.apply({ runtimeArgs: undefined, program: path.resolve(__dirname, 'data', 'utf8.ahk') }))
        .resolves.toMatchObject({ runtimeArgs: attributes.runtimeArgs.defaultValue }),
    );
    test(
      '`runtimeArgs` attribute is not specified and `program` attribute is utf8',
      async() => expect(schema.apply({ runtimeArgs: undefined, program: path.resolve(__dirname, 'data', 'utf8bom.ahk') }))
        .resolves.toMatchObject({ runtimeArgs: attributes.runtimeArgs.defaultValueByUtf8WithBom }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ runtimeArgs: '' })).rejects.toThrow(),
    );
  });
});
