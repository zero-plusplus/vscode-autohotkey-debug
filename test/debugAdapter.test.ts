import * as path from 'path';
import { afterEach, beforeAll, beforeEach, describe, test } from '@jest/globals';
import { DebugClient } from 'vscode-debugadapter-testsupport';
import dedent from 'dedent';
import { ahkRuntime_v1, createAutoHotkeyTestFile, getDebugPort } from './util';
import { debugBuildProject } from '../task/debugBuild';
import { cleanBuild } from '../task/clean';

const defaultDebugConfig = {
  cwd: undefined,
  runtimeArgs: [],
  args: [],
  env: {},
  stopOnEntry: false,
  hostname: '127.0.0.1',
  maxChildren: 10000,
  usePerfTips: false,
  useIntelliSenseInDebugging: false,
  useDebugDirective: false,
  useAutoJumpToError: false,
  useUIAVersion: false,
  useOutputDebug: false,
  useAnnounce: 'error',
  useLoadedScripts: false,
  useExceptionBreakpoint: false,
  openFileOnExit: undefined,
  trace: false,
  skipFunctions: [],
  skipFiles: [],
  variableCategories: undefined,
  setHiddenBreakpoints: undefined,
};

export type EventType =
| 'stopped'
| 'initialized'
| 'breakpoint';

describe('Debug Adapter for AutoHotkey v1', () => {
  const rootDirPath = path.resolve(__dirname, '../');
  const buildDirPath = path.resolve(rootDirPath, 'build');
  const debugAdapterPath = path.resolve(buildDirPath, 'debugAdapter.js');

  let debugClient: DebugClient;
  beforeAll(async() => {
    await cleanBuild();
    await debugBuildProject();
  });
  beforeEach(async() => {
    debugClient = new DebugClient('node', debugAdapterPath, 'autohotkey');
    await debugClient.start();
  });
  afterEach(async() => {
    await debugClient.stop();
  });

  describe('Attribute tests', () => {
    test('stopOnEntry', async() => {
      const testCode = dedent`
          return
        `;
      return createAutoHotkeyTestFile(testCode, async(program) => {
        await Promise.all([
          debugClient.configurationSequence(),
          debugClient.launch({
            ...defaultDebugConfig,
            runtime: ahkRuntime_v1,
            program,
            port: await getDebugPort(),
            stopOnEntry: true,
          }),
          debugClient.assertStoppedLocation('entry', { path: program, line: 1 }),
        ]);
      });
    });
  });

  describe('Breakpoint tests', () => {
    test('normal breakpoint test', async() => {
      const testCode = dedent`
        a := 1
        b := 2
        return
      `;
      return createAutoHotkeyTestFile(testCode, async(program) => {
        await Promise.all([
          debugClient.hitBreakpoint({
            ...defaultDebugConfig,
            runtime: ahkRuntime_v1,
            program,
            port: await getDebugPort(),
          }, { path: program, line: 2 }),
          debugClient.assertStoppedLocation('breakpoint', { path: program, line: 2 }),
        ]);
      });
    });
  });
});
