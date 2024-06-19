import { measureAsyncExecutionTime } from '../../tools/time';
import { BreakpointManager } from '../../types/dap/runtime/breakpoint.types';
import { ContinuationCommandExecutor, ExecResult } from '../../types/dap/runtime/executor.types';
import * as dbgp from '../../types/dbgp/AutoHotkeyDebugger.types';
import { Session } from '../../types/dbgp/session.types';

export const createContinuationCommandExecutor = (session: Session, breakpointManager: BreakpointManager): ContinuationCommandExecutor => {
  const exec = async(command: dbgp.ContinuationCommandName, oldResult?: ExecResult): Promise<ExecResult> => {
    if (oldResult) {
      const { attributes: { status, reason } } = await session.sendStatusCommand();
      if (status === 'break') {
        const { stack } = await session.sendStackGetCommand();
        const callStack = Array.isArray(stack) ? stack : [ stack ];

        const stackFrame = callStack[0];
        if (!stackFrame) {
          throw Error('StackFrame not found.');
        }
        const newResult: ExecResult = {
          reason,
          runState: status,
          command: 'break',
          stackFrame,
          elapsedTime: { ms: -1, ns: -1, s: -1 },
        };
        await execActionpoints(newResult);
        return newResult;
      }
    }

    const [ response, elapsedTime ] = await measureAsyncExecutionTime(async() => session.sendContinuationCommand(command));
    const { stack } = await session.sendStackGetCommand();
    const callStack = Array.isArray(stack) ? stack : [ stack ];
    const stackFrame = callStack[0];
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

      const { stack } = await session.sendStackGetCommand();
      const callStack = Array.isArray(stack) ? stack : [ stack ];
      const stackFrame = callStack[0];
      if (!stackFrame) {
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
      const breakpoints = breakpointManager.getBreakpointsByLine(result.stackFrame.attributes.filename, Number(result.stackFrame.attributes.lineno));
      for await (const breakpoint of breakpoints) {
        breakpoint.condition;
      }
      return Promise.resolve(true);
    }
    async function execActionpoints(result: ExecResult): Promise<void> {
      const breakpoints = breakpointManager.getBreakpointsByLine(result.stackFrame.attributes.filename, Number(result.stackFrame.attributes.lineno));
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

