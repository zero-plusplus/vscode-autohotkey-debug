import { describe, expect, test } from '@jest/globals';
import * as validators from '../../../src/tools/validator';

describe('validator/normalizer', () => {
  test('object', async() => {
    interface NormalizedConfig {
      name: string;
      type: 'launch' | 'attach';
      runtime: string;
      port: number;
      skipFiles: string[];
      useFoo: {
        useBar: boolean;
        useBaz: {
          enabled: boolean;
        };
      };
      alternative: string | number;
      tuple: [ 'a', 'b', 'c' ];
      optional: string | undefined;
    }
    const configRule = validators.object<NormalizedConfig>({
      name: validators.string(),
      type: validators.literalUnion('launch', 'attach'),
      runtime: validators.file(),
      port: validators.number().min(1024).max(65535),
      skipFiles: validators.array(validators.string()),
      useFoo: validators.object<NormalizedConfig['useFoo']>({
        useBar: validators.boolean(),
        useBaz: validators.object<NormalizedConfig['useFoo']['useBaz']>({
          enabled: validators.boolean(),
        }),
      }),
      alternative: validators.alternative(validators.string(), validators.number()),
      tuple: validators.tuple(validators.literal<'a'>(), validators.literal<'b'>(), validators.literal<'c'>()),
      optional: validators.optional(validators.string()),
    })
      .normalizeProperties({
        runtime: {
          undefined: () => {
            return __filename;
          },
        },
        useFoo: (value, schema) => {
          const type = schema.get('type');
          return { useBar: Boolean(value), useBaz: { enabled: type === 'launch' ? Boolean(value) : !value } };
        },
      });

    const configSchema = validators.createSchema(configRule);
    const rawConfig = { name: 'AutoHotkey Debug', type: 'launch', runtime: undefined, port: 9002, skipFiles: [ __filename ], useFoo: true, alternative: 'string', tuple: [ 'a', 'b', 'c' ] };
    const normalizedConfig = { name: 'AutoHotkey Debug', type: 'launch', runtime: __filename, port: 9002, skipFiles: [ __filename ], useFoo: { useBar: true, useBaz: { enabled: true } }, alternative: 'string', tuple: [ 'a', 'b', 'c' ] };

    expect(await configSchema(rawConfig)).toEqual(normalizedConfig);
    await expect(configSchema({})).rejects.toThrow();
    await expect(configSchema({ name: rawConfig.name })).rejects.toThrow();
    await expect(configSchema({ ...rawConfig, unknownKey: 'unknown' })).rejects.toThrow();
  });
});
