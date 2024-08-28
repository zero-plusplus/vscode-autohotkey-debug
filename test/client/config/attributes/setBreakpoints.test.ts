import { describe, expect, test } from '@jest/globals';
import * as attributes from '../../../../src/client/config/attributes';
import { createSchema, object } from '../../../../src/tools/validator';
import { DebugConfig } from '../../../../src/types/dap/config.types';

describe('setBreakpoints', () => {
  const schema = createSchema(object<Partial<DebugConfig>>({
    setBreakpoints: attributes.setBreakpoints.attributeRule,
  }).normalizeProperties({ setBreakpoints: attributes.setBreakpoints.attributeNormalizer }));

  describe('pass', () => {
    test(
      'LineBreakpointData',
      async() => expect(schema.apply({
        setBreakpoints: [
          { fileName: __filename, line: 1 },
          { kind: 'line', fileName: __filename, line: 1 },
          { kind: 'line', fileName: __filename, line: 1, character: 0 },
        ],
      }))
        .resolves.toEqual({
          setBreakpoints: [
            { kind: 'line', fileName: __filename, line: 1 },
            { kind: 'line', fileName: __filename, line: 1 },
            { kind: 'line', fileName: __filename, line: 1, character: 0 },
          ],
        }),
    );
    test(
      'LogpointData',
      async() => expect(schema.apply({
        setBreakpoints: [
          { kind: 'log', fileName: __filename, line: 1, logMessage: '' },
          { kind: 'log', fileName: __filename, line: 1 },
        ],
      }))
        .resolves.toEqual({
          setBreakpoints: [
            { kind: 'log', fileName: __filename, line: 1, logMessage: '' },
            { kind: 'log', fileName: __filename, line: 1 },
          ],
        }),
    );
    test(
      'FunctionBreakpointData',
      async() => expect(schema.apply({
        setBreakpoints: [
          { kind: 'function', name: 'Foo' },
          { kind: 'function', name: 'Foo', logMessage: '' },
        ],
      }))
        .resolves.toEqual({
          setBreakpoints: [
            { kind: 'function', name: 'Foo' },
            { kind: 'function', name: 'Foo', logMessage: '' },
          ],
        }),
    );
    test(
      'ReturnBreakpointData',
      async() => expect(schema.apply({
        setBreakpoints: [
          { kind: 'return', name: 'Foo' },
          { kind: 'return', name: 'Foo', logMessage: '' },
        ],
      }))
        .resolves.toEqual({
          setBreakpoints: [
            { kind: 'return', name: 'Foo' },
            { kind: 'return', name: 'Foo', logMessage: '' },
          ],
        }),
    );
    test(
      'ExceptionBreakpointData',
      async() => expect(schema.apply({
        setBreakpoints: [
          { kind: 'exception', name: 'Foo' },
          { kind: 'exception', name: 'Foo', logMessage: '' },
        ],
      }))
        .resolves.toEqual({
          setBreakpoints: [
            { kind: 'exception', name: 'Foo' },
            { kind: 'exception', name: 'Foo', logMessage: '' },
          ],
        }),
    );
    test(
      'BreakpointDataGroup',
      async() => expect(schema.apply({
        setBreakpoints: [
          { label: 'Foo', breakpoints: [ { fileName: __filename, line: 1 } ] },
          { label: 'Bar', breakpoints: [ { kind: 'function', name: 'Bar' } ] },
        ],
      }))
        .resolves.toEqual({
          setBreakpoints: [
            { label: 'Foo', breakpoints: [ { kind: 'line', fileName: __filename, line: 1 } ] },
            { label: 'Bar', breakpoints: [ { kind: 'function', name: 'Bar' } ] },
          ],
        }),
    );
    test(
      '`setBreakpoints` attribute is not specified',
      async() => expect(schema.apply({ setBreakpoints: undefined }))
        .resolves.toMatchObject({ setBreakpoints: undefined }),
    );
  });
  describe('fail', () => {
    test(
      'Unsupported data',
      async() => expect(schema.apply({ setBreakpoints: '' })).rejects.toThrow(),
    );
  });
});
