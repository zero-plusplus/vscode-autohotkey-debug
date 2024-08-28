import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';
import { SetRequired } from 'type-fest';

describe('usePerfTips', () => {
  const schema = createSchema(object<SetRequired<Partial<DebugConfig>, 'usePerfTips'>>({
    usePerfTips: attributes.usePerfTips.attributeRule,
  }).normalizeProperties({ usePerfTips: attributes.usePerfTips.attributeNormalizer }));

  describe('pass', () => {
    test(
      'Specified `false`',
      async() => expect(schema.apply({ usePerfTips: false })).resolves.toEqual({ usePerfTips: false }),
    );
    test(
      'Specified `true`',
      async() => expect(schema.apply({ usePerfTips: false })).resolves.toEqual({ usePerfTips: attributes.usePerfTips.defaultValue }),
    );

    describe('fontColor', () => {
      test(
        'Specified undefined',
        async() => expect(schema.apply({ usePerfTips: { fontStyle: 'italic', format: '' } }))
          .resolves.toEqual({ usePerfTips: { fontColor: 'gray', fontStyle: 'italic', format: '' } }),
      );
      test(
        'Specified string',
        async() => expect(schema.apply({ usePerfTips: { fontColor: '#000000', fontStyle: 'italic', format: '' } }))
          .resolves.toEqual({ usePerfTips: { fontColor: '#000000', fontStyle: 'italic', format: '' } }),
      );
    });
    describe('fontStyle', () => {
      test(
        'Specified undefined',
        async() => expect(schema.apply({ usePerfTips: { fontStyle: 'italic', fontColor: 'gray', format: '' } }))
          .resolves.toEqual({ usePerfTips: { fontStyle: 'italic', fontColor: 'gray', format: '' } }),
      );
      test(
        'Specified string',
        async() => expect(schema.apply({ usePerfTips: { fontStyle: 'bold', fontColor: 'gray', format: '' } }))
          .resolves.toEqual({ usePerfTips: { fontStyle: 'bold', fontColor: 'gray', format: '' } }),
      );
    });
    describe('format', () => {
      test(
        'Specified undefined',
        async() => expect(schema.apply({ usePerfTips: { format: undefined, fontStyle: 'italic', fontColor: 'gray' } }))
          .resolves.toEqual({ usePerfTips: { format: attributes.usePerfTips.enabledDefaultValue.format, fontStyle: 'italic', fontColor: 'gray' } }),
      );
      test(
        'Specified string',
        async() => expect(schema.apply({ usePerfTips: { format: '', fontStyle: 'bold', fontColor: 'gray' } }))
          .resolves.toEqual({ usePerfTips: { format: '', fontStyle: 'bold', fontColor: 'gray' } }),
      );
    });
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ usePerfTips: 'abc' })).rejects.toThrow(),
    );

    describe('fontColor', () => {
      test(
        'Unsupported data',
        async() => expect(schema.apply({ usePerfTips: { fontColor: {} } })).rejects.toThrow(),
      );
    });
    describe('fontStyle', () => {
      test(
        'Unsupported data',
        async() => expect(schema.apply({ usePerfTips: { fontStyle: {} } })).rejects.toThrow(),
      );
    });
    describe('format', () => {
      test(
        'Unsupported data',
        async() => expect(schema.apply({ usePerfTips: { format: {} } })).rejects.toThrow(),
      );
    });
  });
});
