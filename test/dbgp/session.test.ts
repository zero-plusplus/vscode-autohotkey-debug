import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { TemporaryResource, createTempDirectoryWithFile } from '../../src/tools/temp';
import { utf8BomText } from '../../src/tools/utils/checkUtf8WithBom';
import { createScriptRuntimeLauncher } from '../../src/dap/runtime/launcher';
import { createDefaultDebugConfig } from '../../src/client/config/default';
import { ScriptRuntime } from '../../src/types/dap/runtime/scriptRuntime.types';
import { defaultAutoHotkeyRuntimePath_v1 } from '../../src/tools/autohotkey';

describe('session', () => {
  describe('v1', () => {
    let runtime: ScriptRuntime;
    let testFile: TemporaryResource;
    beforeAll(async() => {
      const text = [
        'a := "foo"',
        'return',
      ].join('\n');

      testFile = await createTempDirectoryWithFile('utf8-with-bom', '.ahk', `${utf8BomText}${text}`);
      const launcher = createScriptRuntimeLauncher({ ...createDefaultDebugConfig(testFile.path), hostname: '127.0.0.1', runtime: defaultAutoHotkeyRuntimePath_v1 });
      runtime = await launcher.launch();
    });
    afterAll(() => {
      testFile.cleanup();
      runtime.close();
    });

    test('setLineBreakpoint', async() => {
      const breakpoint = await runtime.session.setLineBreakpoint(testFile.path, 1);
      expect({ ...breakpoint, fileName: breakpoint.fileName.toLowerCase() }).toEqual({ id: 1, type: 'line', fileName: testFile.path.toLowerCase(), line: 1, state: 'enabled' } as typeof breakpoint);
    });
    test('setExceptionBreakpoint', async() => {
      const breakpoint = await runtime.session.setExceptionBreakpoint(true);
      expect(breakpoint).toEqual({ type: 'exception', state: 'enabled' } as typeof breakpoint);
    });
  });
});
