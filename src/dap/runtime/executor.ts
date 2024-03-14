import { CallStackManager } from '../../types/dap/runtime/callstack.types';
import { ContinuationCommandExecutor } from '../../types/dap/runtime/executor.types';
import * as dbgp from '../../types/dbgp/AutoHotkeyDebugger.types';
import { ExecResult, Session } from '../../types/dbgp/session.types';

export const createContinuationCommandExecutor = (session: Session, callStackManager: CallStackManager): ContinuationCommandExecutor => {
  return async(command: dbgp.ContinuationCommandName): Promise<ExecResult> => {
    const result = await session.exec(command);
    return extraContinuationProcess(result);
  };

  async function extraContinuationProcess(execResult: ExecResult): Promise<ExecResult> {
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
