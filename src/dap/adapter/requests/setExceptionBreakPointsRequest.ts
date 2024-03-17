import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const setExceptionBreakPointsRequest = async <R extends DebugProtocol.SetExceptionBreakpointsResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.SetExceptionBreakpointsArguments): Promise<R> => {
  await adapter.runtime.setExceptionBreakpoint(true);
  return response;
};
