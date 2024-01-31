import { DebugProtocol } from '@vscode/debugprotocol';

export const setFunctionBreakPointsRequest = <R extends DebugProtocol.SetFunctionBreakpointsResponse>(response: R, args: DebugProtocol.SetFunctionBreakpointsArguments): R => {
  return response;
};
