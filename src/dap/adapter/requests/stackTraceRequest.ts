import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const stackTraceRequest = async <R extends DebugProtocol.StackTraceResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.StackTraceArguments): Promise<R> => {
  const startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
  const maxLevels = typeof args.levels === 'number' ? args.levels : 1000;
  const endFrame = startFrame + maxLevels;

  const callStack = await adapter.runtime.fetchCallStack();

  response.body = {
    totalFrames: callStack.length,
    stackFrames: callStack.slice(startFrame, endFrame),
  };
  return response;
};
