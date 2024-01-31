import { DebugProtocol } from '@vscode/debugprotocol';

export const setBreakPointsRequest = <R extends DebugProtocol.SetBreakpointsResponse>(response: R, args: DebugProtocol.SetBreakpointsArguments): R => {
  return response;
};
