import EventEmitter from 'events';
import { safeCall } from '../../tools/utils';
import { NormalizedDebugConfig } from '../../types/dap/config.types';
import { ScriptRuntime } from '../../types/dap/runtime/scriptRuntime.types';
import { Session } from '../../types/dbgp/session.types';
import { createBreakpointManager } from './breakpoint';
import { createCallStackManager } from './callstack';
import { createContinuationCommandExecutor } from './executor';
import { createVariableManager } from './variable';

export const createScriptRuntime = (session: Readonly<Session>, eventEmitter: Readonly<EventEmitter>, config: Readonly<NormalizedDebugConfig>): ScriptRuntime => {
  const callStackManager = createCallStackManager(session);
  const breakpointManager = createBreakpointManager(session);
  const variableManager = createVariableManager(session);
  const exec = createContinuationCommandExecutor(session, config, breakpointManager);

  const runtime: ScriptRuntime = {
    ...breakpointManager,
    ...callStackManager,
    ...variableManager,
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
