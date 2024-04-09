import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { createEvaluator } from '../../../src/tools/AELL/evaluator';
import { TemporaryResource, createTempDirectoryWithFile } from '../../../src/tools/temp';
import { ScriptRuntime } from '../../../src/types/dap/runtime/scriptRuntime.types';
import { AELLEvaluator } from '../../../src/types/tools/AELL/evaluator.types';
import { createScriptRuntimeLauncher } from '../../../src/dap/runtime/launcher';
import EventEmitter from 'events';
import { createDefaultDebugConfig } from '../../../src/client/config/default';
import { utf8BomText } from '../../../src/tools/utils/checkUtf8WithBom';
import { defaultAutoHotkeyRuntimePath_v1 } from '../../../src/tools/autohotkey';
import { createBooleanValue, createNumberValue, createStringValue } from '../../../src/tools/AELL/utils';

describe('evaluator', () => {
  let evaluator: AELLEvaluator;
  let runtime: ScriptRuntime;
  let testFile: TemporaryResource;
  beforeAll(async() => {
    const text = [
      'a()',
      'return',
      '',
      'a() {',
      '  str := "foo"',
      '  int := 123',
      '  float := 123.456',
      '  bool := true',
      '  obj := { str: str, int: int }',
      '  arr := [ str, int, float, bool ]',
      '  return',
      '}',
    ].join('\n');

    testFile = await createTempDirectoryWithFile('evaluator', '.ahk', `${utf8BomText}${text}`);
    const launcher = createScriptRuntimeLauncher(new EventEmitter(), { ...createDefaultDebugConfig(testFile.path), runtime: defaultAutoHotkeyRuntimePath_v1 });
    runtime = await launcher.launch();
    await runtime.session.setLineBreakpoint(testFile.path, 11);
    await runtime.session.exec('run');
    evaluator = createEvaluator(runtime.session);
  });
  afterAll(() => {
    testFile.cleanup();
    runtime.close();
  });

  test.each`
    text          | expected
    ${'"foo"'}    | ${createStringValue('foo')}
    ${'123'}      | ${createNumberValue(123)}
    ${'123.456'}  | ${createNumberValue(123.456)}
    ${'true'}     | ${createBooleanValue('true')}
    ${'false'}    | ${createBooleanValue('false')}
  `('Primitive', async({ text, expected }) => {
    expect(await evaluator.eval(String(text))).toEqual(expected);
  });

  test.each`
    text          | expected
    ${'-1'}    | ${createNumberValue(-1)}
  `('UnaryExpression', async({ text, expected }) => {
    expect(await evaluator.eval(String(text))).toEqual(expected);
  });

  test.each`
    text          | expected
    ${'1 + 1'}    | ${createNumberValue(1 + 1)}
    ${'-1 + -1'}  | ${createNumberValue(-1 + -1)}
  `('BinaryExpression', async({ text, expected }) => {
    expect(await evaluator.eval(String(text))).toEqual(expected);
  });

  test('UnsetProperty', async() => {
    expect(await evaluator.eval('unknown')).toEqual({ constant: false, fullName: 'unknown', name: 'unknown', size: 0, type: 'undefined', value: '' });
  });

  test.each`
    text          | expected
    ${'str'}      | ${{ constant: false, fullName: 'str', name: 'str', size: 3, type: 'string', value: 'foo' }}
    ${'int'}      | ${{ constant: false, fullName: 'int', name: 'int', size: 3, type: 'integer', value: '123' }}
    ${'float'}    | ${{ constant: false, fullName: 'float', name: 'float', size: 7, type: 'string', value: '123.456' }}
    ${'bool'}     | ${{ constant: false, fullName: 'bool', name: 'bool', size: 1, type: 'string', value: '1' }}
  `('Identifier (Primitive)', async({ text, expected }) => {
    expect(await evaluator.eval(String(text))).toEqual(expected);
  });
});
