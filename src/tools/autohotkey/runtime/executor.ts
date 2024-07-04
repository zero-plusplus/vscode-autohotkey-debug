import { measureAsyncExecutionTime } from '../../time';
import { BreakpointManager } from '../../../types/tools/autohotkey/runtime/breakpoint.types';
import { ExecutionContextManager } from '../../../types/tools/autohotkey/runtime/context.types';
import { ContinuationCommandExecutor, ExecResult } from '../../../types/tools/autohotkey/runtime/executor.types';
import * as dbgp from '../../../types/dbgp/AutoHotkeyDebugger.types';
import { Session } from '../../../types/dbgp/session.types';

export const createContinuationCommandExecutor = (session: Session, contextManager: ExecutionContextManager, breakpointManager: BreakpointManager): ContinuationCommandExecutor => {
  const exec = async(command: dbgp.ContinuationCommandName, oldResult?: ExecResult): Promise<ExecResult> => {
    if (oldResult) {
      const contextStatus = await contextManager.getContextStatus();
      if (contextStatus.runState === 'break') {
        const stackFrame = await contextManager.getStackFrame(0);

        if (!stackFrame) {
          throw Error('StackFrame not found.');
        }
        const newResult: ExecResult = {
          ...contextStatus,
          command: 'break',
          stackFrame,
          elapsedTime: { ms: -1, ns: -1, s: -1 },
        };
        await execActionpoints(newResult);
        return newResult;
      }
    }

    const [ response, elapsedTime ] = await measureAsyncExecutionTime(async() => session.sendContinuationCommand(command));
    if (response.attributes.status === 'stopped') {
      return {
        command,
        elapsedTime,
        reason: response.attributes.reason,
        runState: response.attributes.status,
      };
    }

    const stackFrame = await contextManager.getStackFrame(0);
    if (!stackFrame) {
      throw Error('StackFrame not found.');
    }

    const execResult: ExecResult = {
      command,
      elapsedTime,
      reason: response.attributes.reason,
      runState: response.attributes.status,
      stackFrame,
    };

    if (session.server.isTerminated) {
      return execResult;
    }

    const mergedResult = oldResult ? mergeResult(execResult, oldResult) : execResult;
    return extraContinuationProcess(mergedResult);

    async function extraContinuationProcess(execResult: ExecResult): Promise<ExecResult> {
      if (session.server.isTerminated) {
        return execResult;
      }
      if (execResult.runState !== 'break') {
        return execResult;
      }
      if (execResult.stackFrame === undefined) {
        return execResult;
      }

      const stackFrame = await contextManager.getStackFrame(0);
      if (stackFrame === undefined) {
        throw Error('StackFrame not found.');
      }

      const newResult = { ...execResult, stackFrame };
      if (await matchBreakpoints(newResult)) {
        return execResult;
      }
      if (command.startsWith('step')) {
        return extraStepProcess(newResult);
      }
      return exec('run', newResult);
    }
    async function extraStepProcess(execResult: ExecResult): Promise<ExecResult> {
      if (command === 'step_into') {
        return extraStepIntoProcess(execResult);
      }
      return execResult;
    }
    async function extraStepIntoProcess(execResult: ExecResult): Promise<ExecResult> {
      return Promise.resolve(execResult);
    }

    async function matchBreakpoints(result: ExecResult): Promise<boolean> {
      if (result.stackFrame === undefined) {
        return false;
      }

      const breakpoints = breakpointManager.getBreakpointsByLine(result.stackFrame.fileName, result.stackFrame.line);
      for await (const breakpoint of breakpoints) {
        breakpoint.condition;
      }
      return Promise.resolve(true);
    }
    async function execActionpoints(result: ExecResult): Promise<void> {
      if (result.stackFrame === undefined) {
        return;
      }

      const breakpoints = breakpointManager.getBreakpointsByLine(result.stackFrame.fileName, result.stackFrame.line);
      for await (const breakpoint of breakpoints) {
        if (!breakpoint.action) {
          continue;
        }
        await breakpoint.action(session);
      }
    }
    function mergeResult(newResult: ExecResult, oldResult: ExecResult): ExecResult {
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

