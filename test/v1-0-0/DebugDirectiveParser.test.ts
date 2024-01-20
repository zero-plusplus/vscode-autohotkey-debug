import { describe, expect, test } from '@jest/globals';
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import { DebugDirectiveParsedData, DebugDirectiveParser } from '../../src/v1-0-0/util/DebugDirectiveParser';

const createResult = (data: Partial<DebugDirectiveParsedData>): Omit<DebugDirectiveParsedData, 'name'> => {
  return {
    message: undefined,
    condition: undefined,
    hitCondition: undefined,
    ...data,
  };
};

describe('DebugDirective', () => {
  const parser = new DebugDirectiveParser(new AhkVersion('1.0'));
  test('parse', () => {
    expect(parser.parse('; @debug-breakpoint')).toEqual(createResult({ name: 'breakpoint' }));
    expect(parser.parse('; @debug-output test')).toEqual(createResult({ name: 'output', message: 'test\n' }));
    expect(parser.parse('; @Debug-Output, test')).toEqual(createResult({ name: 'output', message: 'test\n' }));
    expect(parser.parse('; @Debug-Output, => test')).toEqual(createResult({ name: 'output', message: 'test\n' }));
    expect(parser.parse('; @Debug-Output, =>| test')).toEqual(createResult({ name: 'output', message: ' test\n' }));
    expect(parser.parse('; @Debug-Output, -> test')).toEqual(createResult({ name: 'output', message: 'test' }));
    expect(parser.parse('; @Debug-Output, ->| test')).toEqual(createResult({ name: 'output', message: ' test' }));
    expect(parser.parse('; @Debug-Output, `=> test')).toEqual(createResult({ name: 'output', message: '=> test\n' }));
  });
  test('parse failure', () => {
    expect(parser.parse(';; @Debug-Output, test')).toEqual(undefined);
    expect(parser.parse('; aa ; @Debug-Output, test')).toEqual(undefined);
    expect(parser.parse('; a @Debug-Output, test')).toEqual(undefined);
  });
  test('parse with condition', () => {
    expect(parser.parse('; @debug-breakpoint (a == b)test')).toEqual(createResult({ name: 'breakpoint', condition: 'a == b', message: 'test\n' }));
    expect(parser.parse('; @debug-breakpoint (a == b) test')).toEqual(createResult({ name: 'breakpoint', condition: 'a == b', message: 'test\n' }));
    expect(parser.parse('; @debug-breakpoint (a == b) => test')).toEqual(createResult({ name: 'breakpoint', condition: 'a == b', message: 'test\n' }));
    expect(parser.parse('; @debug-breakpoint (a == b)[=2] -> test')).toEqual(createResult({ name: 'breakpoint', condition: 'a == b', hitCondition: '=2', message: 'test' }));
    expect(parser.parse('; @debug-breakpoint [=2](a == b) -> test')).toEqual(createResult({ name: 'breakpoint', condition: 'a == b', hitCondition: '=2', message: 'test' }));
    expect(parser.parse('; @debug-breakpoint [=2] (a == b) -> test')).toEqual(createResult({ name: 'breakpoint', condition: 'a == b', hitCondition: '=2', message: 'test' }));
  });
});
