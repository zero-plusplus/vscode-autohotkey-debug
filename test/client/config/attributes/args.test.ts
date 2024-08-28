import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('args', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'args'>>({
    args: attributes.args.attributeRule,
  }).normalizeProperties({ args: attributes.args.attributeNormalizer }));

  test('pass', async() => {
    await expect(schema.apply({ args: [ 'arg1', 'arg2' ] })).resolves.toEqual({ args: [ 'arg1', 'arg2' ] });
  });
  test('fail', async() => {
    await expect(schema.apply({ args: {} })).rejects.toThrow();
  });
});
