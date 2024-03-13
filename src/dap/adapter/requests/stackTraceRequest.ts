import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';
import { StackFrame } from '../../../types/dap/runtime/callstack.types';

export const stackTraceRequest = async <R extends DebugProtocol.StackTraceResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.StackTraceArguments): Promise<R> => {
  const startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
  const maxLevels = typeof args.levels === 'number' ? args.levels : 1000;
  const endFrame = startFrame + maxLevels;

  const callStack = await adapter.runtime.getCallStack();

  response.body = {
    totalFrames: callStack.length,
    stackFrames: toDapStackFrames(callStack).slice(startFrame, endFrame),
  };
  return response;

  function toDapStackFrames(callStack: StackFrame[]): DebugProtocol.StackFrame[] {
    return callStack.map((stackFrame) => {
      return {
        id: stackFrame.id,
        line: stackFrame.line,
        source: {
          path: stackFrame.fileName,
        },
        column: 0,
        name: stackFrame.label,
      };
    });
  }
};
