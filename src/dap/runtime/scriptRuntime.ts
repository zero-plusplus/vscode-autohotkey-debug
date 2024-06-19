import { safeCall } from '../../tools/utils';
import { ScriptRuntime } from '../../types/dap/runtime/scriptRuntime.types';
import { Session } from '../../types/dbgp/session.types';
import { createBreakpointManager } from './breakpoint';
import { createContinuationCommandExecutor } from './executor';
import { createExecutionContextManager } from './context';

export const createScriptRuntime = (session: Readonly<Session>): ScriptRuntime => {
  const contextManager = createExecutionContextManager(session);
  const breakpointManager = createBreakpointManager(session);
  const exec = createContinuationCommandExecutor(session, breakpointManager);

  const runtime: ScriptRuntime = {
    ...breakpointManager,
    ...contextManager,
    threadId: 1,
    session,
    get version() {
      return session.ahkVersion;
    },
    get isClosed() {
      if (!session.server.isTerminated) {
        return false;
      }
      if (session.process === undefined) {
        return true;
      }
      return session.process.isTerminated;
    },
    close: async(): Promise<void> => {
      return session.server.close();
    },
    detach: async(): Promise<void> => {
      return session.server.detach();
    },
    suppressException: async() => {
      return Boolean(await safeCall(async() => {
        return session.sendPropertySetCommand('<exception>', '');
      }));
    },
    exec,
    run: async() => exec('run'),
    stepIn: async() => exec('step_into'),
    stepOut: async() => exec('step_out'),
    stepOver: async() => exec('step_over'),
    stop: async() => exec('stop'),
    pause: async() => {
      const { attributes: { success } } = await session.sendBreakCommand();
      const { attributes: { reason, status } } = await session.sendStatusCommand();
      if (success === '1') {
        return {
          reason,
          runState: status,
        };
      }
      return undefined;
    },
  };
  return runtime;
};
