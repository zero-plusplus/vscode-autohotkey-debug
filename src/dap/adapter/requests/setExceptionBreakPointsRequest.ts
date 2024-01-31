import { DebugProtocol } from '@vscode/debugprotocol';

export const setExceptionBreakPointsRequest = <R extends DebugProtocol.SetExceptionBreakpointsResponse>(response: R, args: DebugProtocol.SetExceptionBreakpointsArguments): R => {
  return response;
};
