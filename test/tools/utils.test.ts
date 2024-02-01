import { describe, expect, test } from '@jest/globals';
import { TimeoutError, deepDefaults, safeCall, sleep, timeoutPromise } from '../../src/tools/utils';

describe('utils', () => {
  test('safeCall', () => {
    expect(safeCall((value) => value, [ 'abc' ])).toBe('abc');
    expect(safeCall(() => {
      throw Error();
    }, [], 123)).toBe(123);
  });
  test('timeoutPromise / sleep', () => {
    expect(timeoutPromise(sleep(1000), 500)).rejects.toThrow(TimeoutError);
  });
  test('deepDefaults', () => {
    const obj = { a: 'value', c: { d: 'value' } } as const;
    const source1 = { a: 'overwrite?', c: { d: 'overwrite?', e: 'value' } } as const;
    const source2 = { b: 'value' } as const;
    const defaulted = deepDefaults(obj, source1, source2);
    expect(defaulted.a).toBe('value');
    expect(defaulted.b).toBe('value');
    expect(defaulted.c).toEqual({ d: 'value', e: 'value' });

    expect(source1).toEqual({ a: 'overwrite?', c: { d: 'overwrite?', e: 'value' } });
    expect(source2).toEqual({ b: 'value' });
  });
});
