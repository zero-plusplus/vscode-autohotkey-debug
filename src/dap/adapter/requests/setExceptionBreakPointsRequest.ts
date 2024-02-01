import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const setExceptionBreakPointsRequest = <R extends DebugProtocol.SetExceptionBreakpointsResponse>(context: DebugContext, response: R, args: DebugProtocol.SetExceptionBreakpointsArguments): R => {
  return response;
};
