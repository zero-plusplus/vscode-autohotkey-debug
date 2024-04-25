import { safeCall } from '../../tools/utils';
import { NormalizedDebugConfig } from '../../types/dap/config.types';
import { ScriptRuntime } from '../../types/dap/runtime/scriptRuntime.types';
import { Session } from '../../types/dbgp/session.types';
import { createBreakpointManager } from './breakpoint';
import { createContinuationCommandExecutor } from './executor';
import { createExecutionContextManager } from './context';

export const createScriptRuntime = (session: Readonly<Session>, config: Readonly<NormalizedDebugConfig>): ScriptRuntime => {
  const contextManager = createExecutionContextManager(session);
  const breakpointManager = createBreakpointManager(session);
  const exec = createContinuationCommandExecutor(session, config, breakpointManager);

  const runtime: ScriptRuntime = {
    ...breakpointManager,
    ...contextManager,
    threadId: 1,
    session,
    config,
    get isClosed() {
      return session.isTerminated;
    },
    async close(): Promise<void> {
      return session.close();
    },
    async detach(): Promise<void> {
      return session.detach();
    },
    async echo(args) {
    },
    async setDebugDirectives() {
    },
    async suppressException() {
      return Boolean(await safeCall(async() => session.suppressException()));
    },
    async setExceptionBreakpoint(state: boolean) {
      return Boolean(await safeCall(async() => session.setExceptionBreakpoint(state)));
    },
    exec,
    run: async() => exec('run'),
    stepIn: async() => exec('step_into'),
    stepOut: async() => exec('step_out'),
    stepOver: async() => exec('step_over'),
    stop: async() => exec('stop'),
    pause: async() => session.break(),
  };
  return runtime;
};
