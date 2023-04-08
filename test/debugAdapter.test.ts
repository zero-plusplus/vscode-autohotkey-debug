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
    test('condition breakpoint test', async() => {
      const testCode = dedent`
        a := 1
        b := 2
        return
      `;
      return createAutoHotkeyTestFile(testCode, async(program) => {
        await debugClient.launch({
          ...defaultDebugConfig,
          runtime: ahkRuntime_v1,
          program,
          port: await getDebugPort(),
          stopOnEntry: true,
        });
        await debugClient.setBreakpointsRequest({ source: { path: program }, breakpoints: [ { line: 3, condition: 'a + b == 3' } ] });
        await debugClient.continueRequest({ threadId: 1 });
        await debugClient.assertStoppedLocation('breakpoint', { path: program, line: 3 });
      });
    });
    describe('Conditional breakpoint skip processing test', () => {
      const testCode = dedent`
        a()
        return
        a() {
          a := ""
          b()
          return
        }
        b() {
          b := ""
          return
        }
        return
      `;

      test('step-out -> skip (a()) -> AutoExec-Section', async() => {
        return createAutoHotkeyTestFile(testCode, async(program) => {
          await debugClient.launch({
            ...defaultDebugConfig,
            runtime: ahkRuntime_v1,
            program,
            port: await getDebugPort(),
            stopOnEntry: true,
          });

          await debugClient.setBreakpointsRequest({ source: { path: program }, breakpoints: [ { line: 4 } ] });
          await debugClient.continueRequest({ threadId: 1 });
          await debugClient.assertStoppedLocation('breakpoint', { path: program, line: 4 });

          await debugClient.setBreakpointsRequest({ source: { path: program }, breakpoints: [ { line: 5, condition: 'false' } ] });
          await debugClient.stepOutRequest({ threadId: 1 });
          await debugClient.assertStoppedLocation('step', { path: program, line: 2 });
        });
      });

      test('step-out -> skip (a()) -> skip (b()) -> stop (AutoExec-Section)', async() => {
        return createAutoHotkeyTestFile(testCode, async(program) => {
          await debugClient.launch({
            ...defaultDebugConfig,
            runtime: ahkRuntime_v1,
            program,
            port: await getDebugPort(),
            stopOnEntry: true,
          });
          await debugClient.setBreakpointsRequest({ source: { path: program }, breakpoints: [ { line: 4 } ] });
          await debugClient.continueRequest({ threadId: 1 });
          await debugClient.assertStoppedLocation('breakpoint', { path: program, line: 4 });

          await debugClient.setBreakpointsRequest({ source: { path: program }, breakpoints: [ { line: 9, condition: 'false' } ] });
          await debugClient.stepOutRequest({ threadId: 1 });
          await debugClient.assertStoppedLocation('step', { path: program, line: 2 });
        });
      });

      test('step-over -> skip (b()) -> stop (a())', async() => {
        return createAutoHotkeyTestFile(testCode, async(program) => {
          await debugClient.launch({
            ...defaultDebugConfig,
            runtime: ahkRuntime_v1,
            program,
            port: await getDebugPort(),
            stopOnEntry: true,
          });
          await debugClient.setBreakpointsRequest({ source: { path: program }, breakpoints: [ { line: 5 } ] });
          await debugClient.continueRequest({ threadId: 1 });
          await debugClient.assertStoppedLocation('breakpoint', { path: program, line: 5 });

          await debugClient.setBreakpointsRequest({ source: { path: program }, breakpoints: [ { line: 5, condition: 'false' } ] });
          await debugClient.setBreakpointsRequest({ source: { path: program }, breakpoints: [ { line: 9, condition: 'false' } ] });
          await debugClient.nextRequest({ threadId: 1 });
          await debugClient.assertStoppedLocation('step', { path: program, line: 6 });
        });
      });

      test('step-over -> skip (a()) -> skip (b()) -> stop (AutoExec-Section)', async() => {
        return createAutoHotkeyTestFile(testCode, async(program) => {
          await debugClient.launch({
            ...defaultDebugConfig,
            runtime: ahkRuntime_v1,
            program,
            port: await getDebugPort(),
            stopOnEntry: true,
          });
          await debugClient.setBreakpointsRequest({ source: { path: program }, breakpoints: [ { line: 1 } ] });
          await debugClient.continueRequest({ threadId: 1 });
          await debugClient.assertStoppedLocation('breakpoint', { path: program, line: 1 });

          await debugClient.setBreakpointsRequest({ source: { path: program }, breakpoints: [ { line: 4, condition: 'false' } ] });
          await debugClient.setBreakpointsRequest({ source: { path: program }, breakpoints: [ { line: 9, condition: 'false' } ] });
          await debugClient.nextRequest({ threadId: 1 });
          await debugClient.assertStoppedLocation('step', { path: program, line: 2 });
        });
      });
    });
  });
});
