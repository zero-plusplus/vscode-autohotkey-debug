import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';

describe('useDebugDirective', () => {
  const schema = createSchema(object<Partial<DebugConfig>>({
    useDebugDirective: attributes.useDebugDirective.attributeRule,
  }).normalizeProperties({ useDebugDirective: attributes.useDebugDirective.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specified `undefined`',
      async() => expect(schema.apply({ useDebugDirective: undefined }))
        .resolves.toEqual({
          useDebugDirective: attributes.useDebugDirective.defaultValue,
        }),
    );
    test(
      'Specified object',
      async() => expect(schema.apply({
        useDebugDirective: {
          useBreakpointDirective: true,
          useClearConsoleDirective: true,
          useOutputDirective: false,
        },
      }))
        .resolves.toEqual({
          useDebugDirective: {
            useBreakpointDirective: true,
            useClearConsoleDirective: true,
            useOutputDirective: false,
          },
        }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ useDebugDirective: '' })).rejects.toThrow(),
    );
  });
});
