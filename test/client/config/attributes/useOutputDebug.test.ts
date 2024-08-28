import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('useOutputDebug', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'useOutputDebug'>>({
    useOutputDebug: attributes.useOutputDebug.attributeRule,
  }).normalizeProperties({ useOutputDebug: attributes.useOutputDebug.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specified `undefined`',
      async() => expect(schema.apply({ useOutputDebug: undefined })).resolves.toEqual({ useOutputDebug: false }),
    );
    test(
      'Specified `false`',
      async() => expect(schema.apply({ useOutputDebug: false })).resolves.toEqual({ useOutputDebug: false }),
    );
    describe('category', () => {
      test(
        'Specified `undefined`',
        async() => expect(schema.apply({ useOutputDebug: { useTrailingLinebreak: true } }))
          .resolves.toEqual({ useOutputDebug: { category: 'stdout', useTrailingLinebreak: true } }),
      );
      test(
        'Specified `"stdout"`',
        async() => expect(schema.apply({ useOutputDebug: { category: 'stdout', useTrailingLinebreak: true } }))
          .resolves.toEqual({ useOutputDebug: { category: 'stdout', useTrailingLinebreak: true } }),
      );
      test(
        'Specified `"stderr"`',
        async() => expect(schema.apply({ useOutputDebug: { category: 'stderr', useTrailingLinebreak: true } }))
          .resolves.toEqual({ useOutputDebug: { category: 'stderr', useTrailingLinebreak: true } }),
      );
      test(
        'Specified `"stderr"`',
        async() => expect(schema.apply({ useOutputDebug: { category: 'console', useTrailingLinebreak: true } }))
          .resolves.toEqual({ useOutputDebug: { category: 'console', useTrailingLinebreak: true } }),
      );
      test(
        'Specified `"important"`',
        async() => expect(schema.apply({ useOutputDebug: { category: 'important', useTrailingLinebreak: true } }))
          .resolves.toEqual({ useOutputDebug: { category: 'important', useTrailingLinebreak: true } }),
      );
    });
    describe('useTrailingLinebreak', () => {
      test(
        'Specified `undefined`',
        async() => expect(schema.apply({ useOutputDebug: { category: 'stdout' } }))
          .resolves.toEqual({ useOutputDebug: { category: 'stdout', useTrailingLinebreak: false } }),
      );
      test(
        'Specified `true`',
        async() => expect(schema.apply({ useOutputDebug: { category: 'stdout', useTrailingLinebreak: true } }))
          .resolves.toEqual({ useOutputDebug: { category: 'stdout', useTrailingLinebreak: true } }),
      );
      test(
        'Specified `false`',
        async() => expect(schema.apply({ useOutputDebug: { category: 'stdout', useTrailingLinebreak: false } }))
          .resolves.toEqual({ useOutputDebug: { category: 'stdout', useTrailingLinebreak: false } }),
      );
    });
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ useOutputDebug: 'abc' })).rejects.toThrow(),
    );
    describe('category', () => {
      test(
        'Unsupported data',
        async() => expect(schema.apply({ useOutputDebug: { category: {}, useTrailingLinebreak: true } })).rejects.toThrow(),
      );
    });
    describe('useTrailingLinebreak', () => {
      test(
        'Unsupported data',
        async() => expect(schema.apply({ useOutputDebug: { category: 'stdout', useTrailingLinebreak: {} } })).rejects.toThrow(),
      );
    });
  });
});
