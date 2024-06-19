import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';
import { callstackToStackFrames } from '../../converter/stackFrame';

export const stackTraceRequest = async <R extends DebugProtocol.StackTraceResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.StackTraceArguments): Promise<R> => {
  const startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
  const maxLevels = typeof args.levels === 'number' ? args.levels : 1000;
  const endFrame = startFrame + maxLevels;

  const callStack = await adapter.runtime.getCallStack();
  const allStackFrames = callstackToStackFrames(adapter.framdIdManager, callStack);
  const stackFrames = allStackFrames.slice(startFrame, endFrame);

  adapter.framdIdManager.setAll(stackFrames);
  response.body = {
    totalFrames: allStackFrames.length,
    stackFrames,
  };
  return response;
};
