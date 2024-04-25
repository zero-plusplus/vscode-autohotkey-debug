import { NormalizedDebugConfig } from '../../types/dap/config.types';
import { BreakpointManager } from '../../types/dap/runtime/breakpoint.types';
import { ContinuationCommandExecutor } from '../../types/dap/runtime/executor.types';
import * as dbgp from '../../types/dbgp/AutoHotkeyDebugger.types';
import { ExecResult, Session, StackFrame } from '../../types/dbgp/session.types';

type Result = ExecResult & { stackFrame: StackFrame };
export const createContinuationCommandExecutor = (session: Session, config: NormalizedDebugConfig, breakpointManager: BreakpointManager): ContinuationCommandExecutor => {
  const exec = async(command: dbgp.ContinuationCommandName, oldResult?: Result): Promise<ExecResult> => {
    if (oldResult) {
      const status = await session.getScriptStatus();
      if (status.runState === 'break') {
        const [ stackFrame ] = await session.getCallStack();
        const newResult: Result = {
          ...status,
          command: 'break',
          stackFrame,
          elapsedTime: { ms: -1, ns: -1, s: -1 },
        };
        await execActionpoints(newResult);
        return newResult;
      }
    }

    const execResult = await session.exec(command);
    if (session.isTerminated) {
      return execResult;
    }

    const [ stackFrame ] = await session.getCallStack();
    const result: Result = { ...execResult, stackFrame };
    const mergedResult = oldResult ? mergeResult(result, oldResult) : result;
    return extraContinuationProcess(mergedResult);

    async function extraContinuationProcess(execResult: Result): Promise<ExecResult> {
      if (session.isTerminated) {
        return execResult;
      }
      if (execResult.runState !== 'break') {
        return execResult;
      }

      const [ stackFrame ] = await session.getCallStack();
      const newResult = { ...execResult, stackFrame };
      if (await matchBreakpoints(newResult)) {
        return execResult;
      }
      if (command.startsWith('step')) {
        return extraStepProcess(newResult);
      }
      return exec('run', newResult);
    }
    async function extraStepProcess(execResult: Result): Promise<ExecResult> {
      if (command === 'step_into') {
        return extraStepIntoProcess(execResult);
      }
      return execResult;
    }
    async function extraStepIntoProcess(execResult: Result): Promise<ExecResult> {
      return Promise.resolve(execResult);
    }

    async function matchBreakpoints(result: Result): Promise<boolean> {
      const breakpoints = breakpointManager.getBreakpointsByLine(result.stackFrame.fileName, result.stackFrame.line);
      for await (const breakpoint of breakpoints) {
        breakpoint.condition;
      }
      return Promise.resolve(true);
    }
    async function execActionpoints(result: Result): Promise<void> {
      const breakpoints = breakpointManager.getBreakpointsByLine(result.stackFrame.fileName, result.stackFrame.line);
      for await (const breakpoint of breakpoints) {
        if (!breakpoint.action) {
          continue;
        }
        await breakpoint.action(session);
      }
    }
    function mergeResult(newResult: Result, oldResult: Result): Result {
      return {
        ...newResult,
        elapsedTime: {
          ns: oldResult.elapsedTime.ns + newResult.elapsedTime.ns,
          ms: oldResult.elapsedTime.ms + newResult.elapsedTime.ms,
          s: oldResult.elapsedTime.s + newResult.elapsedTime.s,
        },
      };
    }
  };
  return exec;
};

