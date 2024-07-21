import { describe, expect, test } from '@jest/globals';
import * as validators from '../../../src/tools/validator';

describe('validator/normalizer', () => {
  test('object', async() => {
    interface UseFoo {
      useBar?: boolean;
      useBaz: boolean;
    }
    const configRule = validators.object({
      name: validators.string(),
      type: validators.string().union('launch', 'attach'),
      runtime: validators.file().normalize({
        'undefined': () => __filename,
      }),
      port: validators.number().min(1024).max(65535),
      skipFiles: validators.array(validators.string()),
      useFoo: validators.object<UseFoo>({
        useBar: validators.boolean().optional(),
        useBaz: validators.boolean(),
      }).normalize({
        'boolean': (value: boolean) => {
          return { useBar: value, useBaz: value };
        },
      }),
      alternativeAttribute: validators.alternative<string | boolean>(validators.string(), validators.boolean()),
      optionalAttribute: validators.optional(validators.boolean()),
    });
    const configSchema = validators.createSchema(configRule);

    const rawConfig = { name: 'AutoHotkey Debug', type: 'launch', runtime: undefined, port: 9002, skipFiles: [ __filename ], useFoo: true, alternativeAttribute: 'string' };
    const normalizedConfig = { name: 'AutoHotkey Debug', type: 'launch', runtime: __filename, port: 9002, skipFiles: [ __filename ], useFoo: { useBar: true, useBaz: true }, alternativeAttribute: 'string' };
    expect(await configSchema(rawConfig)).toEqual(normalizedConfig);

    await expect(configSchema({})).rejects.toThrow();
    await expect(configSchema({ name: rawConfig.name })).rejects.toThrow();
    await expect(configSchema({ ...rawConfig, unknownKey: 'unknown' })).rejects.toThrow();
  });
});
