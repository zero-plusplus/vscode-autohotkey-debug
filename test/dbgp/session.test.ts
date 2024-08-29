import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { TemporaryResource, createTempDirectoryWithFile } from '../../src/tools/temp';
import { utf8BomText } from '../../src/tools/utils/checkUtf8WithBom';
import { createScriptRuntimeLauncher } from '../../src/tools/autohotkey/runtime/launcher';
import { createDefaultDebugConfig } from '../../src/client/config/default';
import { ScriptRuntime } from '../../src/types/tools/autohotkey/runtime/scriptRuntime.types';
import { defaultAutoHotkeyRuntimePath_v1 } from '../../src/tools/autohotkey';
import { CallStack } from '../../src/types/dbgp/session.types';
import { debugConfigRule } from '../../src/client/config/validator';
import { createSchema } from '../../src/tools/validator';

describe('session', () => {
  describe('v1', () => {
    let runtime: ScriptRuntime;
    let testFile: TemporaryResource;
    beforeAll(async() => {
      const text = [
        'a()',
        'return',
        '',
        'a() {',
        '  a := "foo"',
        '  b := {}',
        '  c := { a: { b: { c: { d: "foo" } } }, e: a }',
        '  d := [ a, b, c ]',
        '}',
      ].join('\n');

      testFile = await createTempDirectoryWithFile('utf8-with-bom', '.ahk', `${utf8BomText}${text}`);
      const schema = createSchema(debugConfigRule);
      const config = await schema.apply({ ...createDefaultDebugConfig(testFile.path), runtime: defaultAutoHotkeyRuntimePath_v1, port: '9005-9010' });
      const launcher = createScriptRuntimeLauncher(config);
      runtime = await launcher.launch();
    });
    afterAll(() => {
      testFile.cleanup();
      runtime.close();
    });

    test('getBreakpointById / setLineBreakpoint / removeBreakpointById / exec', async() => {
      expect(runtime.version.mejor).toBe(1.1);

      const exceptionBreakpoint = await runtime.setExceptionBreakpoint(true);
      expect(exceptionBreakpoint).toEqual({ type: 'exception', state: 'enabled' });

      const breakpoint = await runtime.setLineBreakpoint({ kind: 'line', fileName: testFile.path, line: 1, hidden: false });
      expect({ ...breakpoint, fileName: breakpoint.fileName.toLowerCase() }).toEqual({ id: 2, type: 'line', fileName: testFile.path.toLowerCase(), line: 1, state: 'enabled' });

      await runtime.exec('run');
      const callStack = await runtime.getCallStack();
      expect(callStack.map((stackFrame) => ({ ...stackFrame, fileName: stackFrame.fileName.toLowerCase() }))).toEqual([
        {
          fileName: testFile.path.toLowerCase(),
          line: 1,
          level: 0,
          type: 'file',
          where: 'Auto-execute thread',
        },
      ] as CallStack);

      const breakpoint2 = await runtime.setLineBreakpoint({ kind: 'line', fileName: testFile.path, line: 9, hidden: false });
      expect({ ...breakpoint2, fileName: breakpoint.fileName.toLowerCase() }).toEqual({ id: 3, type: 'line', fileName: testFile.path.toLowerCase(), line: 9, state: 'enabled' });

      await runtime.exec('run');
      const callStack2 = await runtime.getCallStack();
      expect(callStack2.map((stackFrame) => ({ ...stackFrame, fileName: stackFrame.fileName.toLowerCase() }))).toEqual([
        {
          fileName: testFile.path.toLowerCase(),
          line: 9,
          level: 0,
          type: 'file',
          where: 'a()',
        },
        {
          fileName: testFile.path.toLowerCase(),
          line: 1,
          level: 1,
          type: 'file',
          where: 'Auto-execute thread',
        },
      ] as CallStack);

      await runtime.removeBreakpointById(breakpoint.id);
      expect(() => runtime.getBreakpointById(breakpoint.id)).toBeUndefined();

      // const localContext = await runtime.getContext('Local');
      // const a = await runtime.getProperty('a', localContext.id);
      // expect(a).toEqual({
      //   contextId: 0,
      //   stackLevel: 0,
      //   name: 'a',
      //   fullName: 'a',
      //   type: 'string',
      //   value: 'foo',
      //   size: 3,
      //   constant: false,
      // } as PrimitiveProperty);
    });
  });
});
