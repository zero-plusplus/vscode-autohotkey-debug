import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { TemporaryResource, createTempDirectoryWithFile } from '../../src/tools/temp';
import { utf8BomText } from '../../src/tools/utils/checkUtf8WithBom';
import { createScriptRuntimeLauncher } from '../../src/dap/runtime/launcher';
import { createDefaultDebugConfig } from '../../src/client/config/default';
import { ScriptRuntime } from '../../src/types/dap/runtime/scriptRuntime.types';
import { defaultAutoHotkeyRuntimePath_v1 } from '../../src/tools/autohotkey';
import { DbgpError } from '../../src/dbgp/error';
import { CallStack, PrimitiveProperty } from '../../src/types/dbgp/session.types';

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
      const launcher = createScriptRuntimeLauncher({ ...createDefaultDebugConfig(testFile.path), runtime: defaultAutoHotkeyRuntimePath_v1 });
      runtime = await launcher.launch();
    });
    afterAll(() => {
      testFile.cleanup();
      runtime.close();
    });

    test('getBreakpointById / setLineBreakpoint / removeBreakpointById / exec', async() => {
      expect(runtime.session.version.mejor).toBe(1.1);

      const exceptionBreakpoint = await runtime.session.setExceptionBreakpoint(true);
      expect(exceptionBreakpoint).toEqual({ type: 'exception', state: 'enabled' } as typeof exceptionBreakpoint);

      const breakpoint = await runtime.session.setLineBreakpoint(testFile.path, 1);
      expect({ ...breakpoint, fileName: breakpoint.fileName.toLowerCase() }).toEqual({ id: 2, type: 'line', fileName: testFile.path.toLowerCase(), line: 1, state: 'enabled' } as typeof breakpoint);

      await runtime.session.exec('run');
      const callStack = await runtime.session.getCallStack();
      expect(callStack.map((stackFrame) => ({ ...stackFrame, fileName: stackFrame.fileName.toLowerCase() }))).toEqual([
        {
          fileName: testFile.path.toLowerCase(),
          line: 1,
          level: 0,
          type: 'file',
          where: 'Auto-execute thread',
        },
      ] as CallStack);

      const breakpoint2 = await runtime.session.setLineBreakpoint(testFile.path, 9);
      expect({ ...breakpoint2, fileName: breakpoint.fileName.toLowerCase() }).toEqual({ id: 3, type: 'line', fileName: testFile.path.toLowerCase(), line: 9, state: 'enabled' } as typeof breakpoint);

      await runtime.session.exec('run');
      const callStack2 = await runtime.session.getCallStack();
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

      await runtime.session.removeBreakpointById(breakpoint.id);
      await expect(async() => runtime.session.getBreakpointById(breakpoint.id)).rejects.toThrow(DbgpError);

      const localContext = await runtime.session.getContext(0);
      const a = await runtime.session.getProperty(localContext.id, 'a');
      expect(a).toEqual({
        contextId: 0,
        depth: undefined,
        name: 'a',
        fullName: 'a',
        type: 'string',
        value: 'foo',
        size: 3,
        constant: false,
      } as PrimitiveProperty);
    });
  });
});
