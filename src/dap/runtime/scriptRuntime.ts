import { NormalizedDebugConfig } from '../../types/dap/config.types';
import { LineBreakpoint } from '../../types/dap/runtime/breakpoint.types';
import { ScriptRuntime } from '../../types/dap/runtime/scriptRuntime.types';
import * as dbgp from '../../types/dbgp/AutoHotkeyDebugger.types';
import { ExecResult, Session } from '../../types/dbgp/session.types';
import { createBreakpointManager } from './breakpoint';

export const createScriptRuntime = (session: Session, config: NormalizedDebugConfig): ScriptRuntime => {
  const breakpointManager = createBreakpointManager(session);
  const runtime: ScriptRuntime = {
    threadId: 1,
    session,
    config,
    get isClosed() {
      return session.isTerminatedProcess;
    },
    async close(): Promise<Error | undefined> {
      return session.close();
    },
    async detach(): Promise<Error | undefined> {
      return session.detach();
    },
    async echo(args) {
    },
    async setDebugDirectives() {
    },
    async exec(command: dbgp.ContinuationCommandName) {
      const result = await session.exec(command);
      return customContinuationProcess(result);
    },
    async setLineBreakpoint(breakpointData) {
      return breakpointManager.setLineBreakpoint(breakpointData);
    },
    async setLineBreakpoints(breakpointDataList) {
      const breakpoints: LineBreakpoint[] = [];
      for await (const breakpointData of breakpointDataList) {
        breakpoints.push(await this.setLineBreakpoint(breakpointData));
      }
      return breakpoints;
    },
    onStdOut() {
    },
    onStdErr(message) {
    },
    onOutputDebug(message) {
    },
    onWarning(message) {
    },
    onError(error) {
    },
    onProcessClose(exitCode) {
    },
    onServerClose() {
    },
    onSocketClose() {
    },
  };

  session.on('process:close', runtime.onProcessClose);
  session.on('process:error', runtime.onError);
  session.on('process:stdout', runtime.onStdOut);
  session.on('process:stderr', runtime.onStdErr);
  session.on('debugger:close', runtime.onSocketClose);
  session.on('debugger:error', runtime.onError);
  session.on('debugger:stdout', runtime.onStdOut);
  session.on('debugger:stderr', runtime.onOutputDebug);
  session.on('server:close', runtime.onServerClose);
  session.on('server:error', runtime.onError);
  return runtime;

  async function customContinuationProcess(execResult: ExecResult): Promise<ExecResult> {
    if (session.isTerminatedProcess) {
      return execResult;
    }
    if (execResult.runState !== 'break') {
      return execResult;
    }

    const [ stackFrame ] = await session.getCallStack();
    stackFrame;
    return execResult;
  }
};
