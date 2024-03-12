import { NormalizedDebugConfig } from '../../types/dap/config.types';
import { ScriptRuntime } from '../../types/dap/runtime/scriptRuntime.types';
import { Session } from '../../types/dbgp/session.types';
import { createBreakpointManager } from './breakpoint';
import { createCallStackManager } from './callstack';
import { createContinuationCommandExecutor } from './executor';

export const createScriptRuntime = (session: Session, config: NormalizedDebugConfig): ScriptRuntime => {
  const callStackManager = createCallStackManager(session);
  const breakpointManager = createBreakpointManager(session);
  const exec = createContinuationCommandExecutor(session);

  const runtime: ScriptRuntime = {
    ...breakpointManager,
    ...callStackManager,
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
    exec,
    run: async() => exec('run'),
    stepIn: async() => exec('step_into'),
    stepOut: async() => exec('step_out'),
    stepOver: async() => exec('step_over'),
    stop: async() => exec('stop'),
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
};
