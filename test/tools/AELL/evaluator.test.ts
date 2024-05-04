/* eslint-disable no-bitwise, no-mixed-operators */
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { createEvaluator } from '../../../src/tools/AELL/evaluator';
import { TemporaryResource, createTempDirectoryWithFile } from '../../../src/tools/temp';
import { ScriptRuntime } from '../../../src/types/dap/runtime/scriptRuntime.types';
import { AELLEvaluator } from '../../../src/types/tools/AELL/evaluator.types';
import { createScriptRuntimeLauncher } from '../../../src/dap/runtime/launcher';
import { createDefaultDebugConfig } from '../../../src/client/config/default';
import { utf8BomText } from '../../../src/tools/utils/checkUtf8WithBom';
import { defaultAutoHotkeyRuntimePath_v1, defaultAutoHotkeyRuntimePath_v2 } from '../../../src/tools/autohotkey';
import { createAELLUtils } from '../../../src/tools/AELL/utils';
import { validateDebugConfig } from '../../../src/client/config/validator';

describe('evaluator', () => {
  describe('v2', () => {
    let evaluator: AELLEvaluator;
    let runtime: ScriptRuntime;
    let testFile: TemporaryResource;
    const {
      createBooleanProperty,
      createIdentifierProperty,
      createNumberProperty,
      createStringProperty,
    } = createAELLUtils('2.0.0');

    beforeAll(async() => {
      const text = `
      a()
        return

        a() {
          count := 0
          str := "foo"
          int := 123
          float := 123.456
          bool := true
          index := 1
          objKeys := [ "str", "int" ]
          arr := [ str, int, float, bool ]
          key := "str"
          obj := { str: str, int: int, arr: arr }
          mp := Map("str", str, "int", int, "arr", arr)
        }
      `;

      testFile = await createTempDirectoryWithFile('evaluator-v2', '.ahk', `${utf8BomText}${text}`);
      const config = await validateDebugConfig({ ...createDefaultDebugConfig(testFile.path), runtime: defaultAutoHotkeyRuntimePath_v2, port: '9005-9010' });
      const launcher = createScriptRuntimeLauncher(config);
      runtime = await launcher.launch();
      await runtime.session.setLineBreakpoint(testFile.path, 17);
      await runtime.session.exec('run');
      evaluator = createEvaluator(runtime.session);
    });
    afterAll(() => {
      runtime.close();
      testFile.cleanup();
    });

    test('Primitive', async() => {
      expect(await evaluator.eval('"foo"')).toEqual(createStringProperty('foo'));
      expect(await evaluator.eval('123')).toEqual(createNumberProperty('123'));
      expect(await evaluator.eval('123.456')).toEqual(createNumberProperty('123.456'));
      expect(await evaluator.eval('true')).toEqual(createBooleanProperty('true'));
      expect(await evaluator.eval('false')).toEqual(createBooleanProperty('false'));
    });

    test('UnaryExpression', async() => {
      expect(await evaluator.eval('+1')).toEqual(createNumberProperty(+1));
      expect(await evaluator.eval('-1')).toEqual(createNumberProperty(-1));

      expect(await evaluator.eval('!true')).toEqual(createBooleanProperty(false));
      expect(await evaluator.eval('!false')).toEqual(createBooleanProperty(true));
      expect(await evaluator.eval('!!"abc"')).toEqual(createBooleanProperty(true));
      expect(await evaluator.eval('!!"1"')).toEqual(createBooleanProperty(true));
      expect(await evaluator.eval('!!"0"')).toEqual(createBooleanProperty(false));
      expect(await evaluator.eval('~"0"')).toEqual(createNumberProperty(-1));
    });

    test('Increment / Decrement', async() => {
      expect(await evaluator.eval('count')).toEqual(createIdentifierProperty('count', createNumberProperty(0, 'Local')));
      expect(await evaluator.eval('++count')).toEqual(createIdentifierProperty('count', createNumberProperty(1, 'Local')));
      expect(await evaluator.eval('count++')).toEqual(createIdentifierProperty('count', createNumberProperty(1, 'Local')));
      expect(await evaluator.eval('--count')).toEqual(createIdentifierProperty('count', createNumberProperty(1, 'Local')));
      expect(await evaluator.eval('count--')).toEqual(createIdentifierProperty('count', createNumberProperty(1, 'Local')));
      expect(await evaluator.eval('count')).toEqual(createIdentifierProperty('count', createNumberProperty(0, 'Local')));
    });
    test('BinaryExpression', async() => {
      expect(await evaluator.eval('1 + 1')).toEqual(createNumberProperty(1 + 1));
      expect(await evaluator.eval('-1 + -1')).toEqual(createNumberProperty(-1 + -1));
      expect(await evaluator.eval('1 - 1')).toEqual(createNumberProperty(1 - 1));
      expect(await evaluator.eval('1 * 2 + 3')).toEqual(createNumberProperty(1 * 2 + 3));
      expect(await evaluator.eval('1 ** 2 * 3')).toEqual(createNumberProperty(1 ** 2 * 3));
      expect(await evaluator.eval('1 / 2')).toEqual(createNumberProperty(1 / 2));
      expect(await evaluator.eval('2 << 2')).toEqual(createNumberProperty(2 << 2));
      expect(await evaluator.eval('2 << 2')).toEqual(createNumberProperty(2 << 2));
      expect(await evaluator.eval('-3 >> 1')).toEqual(createNumberProperty(-3 >> 1));
      expect(await evaluator.eval('1 & 1')).toEqual(createNumberProperty(1 & 1));
      expect(await evaluator.eval('1 ^ 1')).toEqual(createNumberProperty(1 ^ 1));
      expect(await evaluator.eval('1 | 1')).toEqual(createNumberProperty(1 | 1));

      expect(await evaluator.eval('5 // 3')).toEqual(createNumberProperty(1));
      expect(await evaluator.eval('5 // -3')).toEqual(createNumberProperty(-1));
      expect(await evaluator.eval('-1 >>> 1')).toEqual(createNumberProperty(9223372036854775807n));

      expect(await evaluator.eval('"a" = "A"')).toEqual(createBooleanProperty(true));
      expect(await evaluator.eval('"a" == "A"')).toEqual(createBooleanProperty(false));
      expect(await evaluator.eval('"a" == "a"')).toEqual(createBooleanProperty(true));
      expect(await evaluator.eval('"a" != "A"')).toEqual(createBooleanProperty(false));
      expect(await evaluator.eval('"a" != "a"')).toEqual(createBooleanProperty(false));
      expect(await evaluator.eval('"a" !== "A"')).toEqual(createBooleanProperty(true));
    });

    test('UnsetProperty', async() => {
      expect(await evaluator.eval('unknown')).toEqual({ contextId: 0, stackLevel: undefined, constant: false, fullName: 'unknown', name: 'unknown', size: 0, type: 'undefined', value: '' });
    });

    test('Identifier (Primitive)', async() => {
      expect(await evaluator.eval('str')).toMatchObject({ constant: false, fullName: 'str', name: 'str', size: 3, type: 'string', value: 'foo' });
      expect(await evaluator.eval('int')).toMatchObject({ constant: false, fullName: 'int', name: 'int', size: 3, type: 'integer', value: '123' });
      expect(await evaluator.eval('float')).toMatchObject({ constant: false, fullName: 'float', name: 'float', size: 7, type: 'float', value: '123.456' });
      expect(await evaluator.eval('bool')).toMatchObject({ constant: false, fullName: 'bool', name: 'bool', size: 1, type: 'integer', value: '1' });
    });

    test('PropertyAccessExpression', async() => {
      expect(await evaluator.eval('obj.str')).toMatchObject({ constant: false, fullName: 'obj.str', name: 'str', size: 3, type: 'string', value: 'foo' });
      expect(await evaluator.eval('obj.int')).toMatchObject({ constant: false, fullName: 'obj.int', name: 'int', size: 3, type: 'integer', value: '123' });
    });

    test('ElementAccessExpression', async() => {
      expect(await evaluator.eval('arr[1]')).toMatchObject({ constant: false, fullName: 'arr[1]', name: '[1]', size: 3, type: 'string', value: 'foo' });
      expect(await evaluator.eval('arr[2]')).toMatchObject({ constant: false, fullName: 'arr[2]', name: '[2]', size: 3, type: 'integer', value: '123' });
      expect(await evaluator.eval('mp["arr"]')).toMatchObject({ fullName: 'mp["arr"]', name: '["arr"]', type: 'object' });
      expect(await evaluator.eval('mp["arr"][2]')).toMatchObject({ constant: false, fullName: 'mp["arr"][2]', name: '[2]', size: 3, type: 'integer', value: '123' });
    });

    test('not support', async() => {
      await expect(async() => evaluator.eval('5.0 // 3')).rejects.toThrow();
      await expect(async() => evaluator.eval('5 // 3.0')).rejects.toThrow();
    });
  });

  describe('v1', () => {
    let evaluator: AELLEvaluator;
    let runtime: ScriptRuntime;
    let testFile: TemporaryResource;
    const { createNumberProperty } = createAELLUtils('1.0.0');

    beforeAll(async() => {
      const text = `
        a()
        return

        a() {
          count := 0
          str := "foo"
          int := 123
          float := 123.456
          bool := true
          objKeys := [ "str", "int" ]
          arr := [ str, int, float, bool ]
          obj := { str: str, int: int, arr: arr }
        }
      `;

      testFile = await createTempDirectoryWithFile('evaluator-v1', '.ahk', `${utf8BomText}${text}`);
      const config = await validateDebugConfig({ ...createDefaultDebugConfig(testFile.path), runtime: defaultAutoHotkeyRuntimePath_v1, port: '9005-9010' });
      const launcher = createScriptRuntimeLauncher(config);
      runtime = await launcher.launch();
      await runtime.session.setLineBreakpoint(testFile.path, 13);
      await runtime.session.exec('run');
      evaluator = createEvaluator(runtime.session);
    });
    afterAll(() => {
      runtime.close();
      testFile.cleanup();
    });

    test.each`
      text
      ${'"a" !== "A"'}
    `('not support', async({ text }) => {
      await expect(async() => evaluator.eval(String(text))).rejects.toThrow();
    });

    test('Identifier (Primitive)', async() => {
      expect(await evaluator.eval('str')).toMatchObject({ constant: false, fullName: 'str', name: 'str', size: 3, type: 'string', value: 'foo' });
      expect(await evaluator.eval('int')).toMatchObject({ constant: false, fullName: 'int', name: 'int', size: 3, type: 'integer', value: '123' });
      expect(await evaluator.eval('float')).toMatchObject({ constant: false, fullName: 'float', name: 'float', size: 7, type: 'string', value: '123.456' });
      expect(await evaluator.eval('bool')).toMatchObject({ constant: false, fullName: 'bool', name: 'bool', size: 1, type: 'string', value: '1' });
    });

    test('BinaryExpression', async() => {
      expect(await evaluator.eval('5.0 // 3')).toEqual(createNumberProperty('1.0'));
      expect(await evaluator.eval('5 // 3.0')).toEqual(createNumberProperty('1.0'));
    });
  });
});
