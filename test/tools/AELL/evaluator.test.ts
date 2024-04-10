/* eslint-disable no-bitwise */
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
import { createBooleanProperty, createIdentifierProperty, createNumberProperty, createStringProperty } from '../../../src/tools/AELL/utils';
import { ContextId } from '../../../src/types/dbgp/AutoHotkeyDebugger.types';

describe('evaluator', () => {
  const text = [
    'a()',
    'return',
    '',
    'a() {',
    '  count := 0',
    '  str := "foo"',
    '  int := 123',
    '  float := 123.456',
    '  bool := true',
    '  obj := { str: str, int: int }',
    '  arr := [ str, int, float, bool ]',
    '  return',
    '}',
  ].join('\n');

  describe('v1', () => {
    let evaluator: AELLEvaluator;
    let runtime: ScriptRuntime;
    let testFile: TemporaryResource;
    beforeAll(async() => {
      testFile = await createTempDirectoryWithFile('evaluator-v1', '.ahk', `${utf8BomText}${text}`);
      const launcher = createScriptRuntimeLauncher(new EventEmitter(), { ...createDefaultDebugConfig(testFile.path), runtime: defaultAutoHotkeyRuntimePath_v1 });
      runtime = await launcher.launch();
      await runtime.session.setLineBreakpoint(testFile.path, 12);
      await runtime.session.exec('run');
      evaluator = createEvaluator(runtime.session);
    });
    afterAll(() => {
      runtime.close();
      testFile.cleanup();
    });

    test.each`
      text          | expected
      ${'"foo"'}    | ${createStringProperty('foo')}
      ${'123'}      | ${createNumberProperty(123)}
      ${'123.456'}  | ${createNumberProperty(123.456)}
      ${'true'}     | ${createBooleanProperty('true')}
      ${'false'}    | ${createBooleanProperty('false')}
    `('Primitive', async({ text, expected }) => {
      expect(await evaluator.eval(String(text))).toEqual(expected);
    });

    test.each`
      text          | expected
      ${'+1'}       | ${createNumberProperty(+1)}
      ${'-1'}       | ${createNumberProperty(-1)}
      ${'!true'}    | ${createBooleanProperty(false)}
      ${'!false'}   | ${createBooleanProperty(true)}
      ${'!!"abc"'}  | ${createBooleanProperty(true)}
      ${'!!"1"'}    | ${createBooleanProperty(true)}
      ${'!!"0"'}    | ${createBooleanProperty(false)}
      ${'~"0"'}     | ${createNumberProperty(-1)}
    `('UnaryExpression', async({ text, expected }) => {
      expect(await evaluator.eval(String(text))).toEqual(expected);
    });

    test.each`
      text          | expected
      ${'count'}    | ${createIdentifierProperty('count', createNumberProperty(0, ContextId.Local))}
      ${'++count'}  | ${createIdentifierProperty('count', createNumberProperty(1, ContextId.Local))}
      ${'count++'}  | ${createIdentifierProperty('count', createNumberProperty(1, ContextId.Local))}
      ${'--count'}  | ${createIdentifierProperty('count', createNumberProperty(1, ContextId.Local))}
      ${'count--'}  | ${createIdentifierProperty('count', createNumberProperty(1, ContextId.Local))}
      ${'count'}    | ${createIdentifierProperty('count', createNumberProperty(0, ContextId.Local))}
      `('Increment / Decrement', async({ text, expected }) => {
      expect(await evaluator.eval(String(text))).toEqual(expected);
    });

    test.each`
      text            | expected
      ${'1 + 1'}      | ${createNumberProperty(1 + 1)}
      ${'-1 + -1'}    | ${createNumberProperty(-1 + -1)}
      ${'1 - 1'}      | ${createNumberProperty(1 - 1)}
      ${'1 * 2 + 3'}  | ${createNumberProperty((1 * 2) + 3)}
      ${'1 ** 2 * 3'} | ${createNumberProperty((1 ** 2) * 3)}
      ${'1 / 2'}      | ${createNumberProperty(1 / 2)}
      ${'5 // 3'}     | ${createNumberProperty(1)}
      ${'5 // -3'}    | ${createNumberProperty(-1)}
      ${'5.0 // 3'}   | ${createNumberProperty(1.0)}
      ${'5 // 3.0'}   | ${createNumberProperty(1.0)}
      ${'2 << 2'}     | ${createNumberProperty(2 << 2)}
    `('BinaryExpression', async({ text, expected }) => {
      expect(await evaluator.eval(String(text))).toEqual(expected);
    });

    test('UnsetProperty', async() => {
      expect(await evaluator.eval('unknown')).toEqual({ contextId: ContextId.Global, constant: false, fullName: 'unknown', name: 'unknown', size: 0, type: 'undefined', value: '' });
    });

    test.each`
      text          | expected
      ${'str'}      | ${{ constant: false, fullName: 'str', name: 'str', size: 3, type: 'string', value: 'foo' }}
      ${'int'}      | ${{ constant: false, fullName: 'int', name: 'int', size: 3, type: 'integer', value: '123' }}
      ${'float'}    | ${{ constant: false, fullName: 'float', name: 'float', size: 7, type: 'string', value: '123.456' }}
      ${'bool'}     | ${{ constant: false, fullName: 'bool', name: 'bool', size: 1, type: 'string', value: '1' }}
    `('Identifier (Primitive)', async({ text, expected }) => {
      expect(await evaluator.eval(String(text))).toMatchObject(expected as Record<string, any>);
    });
  });

  // describe('v2', () => {
  //   let evaluator: AELLEvaluator;
  //   let runtime: ScriptRuntime;
  //   let testFile: TemporaryResource;
  //   beforeAll(async() => {
  //     testFile = await createTempDirectoryWithFile('evaluator-v2', '.ahk', `${utf8BomText}${text}`);
  //     const launcher = createScriptRuntimeLauncher(new EventEmitter(), { ...createDefaultDebugConfig(testFile.path), runtime: defaultAutoHotkeyRuntimePath_v2 });
  //     runtime = await launcher.launch();
  //     await runtime.session.setLineBreakpoint(testFile.path, 13);
  //     await runtime.session.exec('run');
  //     evaluator = createEvaluator(runtime.session);
  //   });
  //   afterAll(() => {
  //     runtime.close();
  //     testFile.cleanup();
  //   });
  // });
});
