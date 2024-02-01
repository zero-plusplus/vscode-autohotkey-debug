import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const setBreakPointsRequest = <R extends DebugProtocol.SetBreakpointsResponse>(context: DebugContext, response: R, args: DebugProtocol.SetBreakpointsArguments): R => {
  return response;
};
