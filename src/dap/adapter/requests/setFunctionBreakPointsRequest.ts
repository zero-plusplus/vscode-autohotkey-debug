import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const setFunctionBreakPointsRequest = <R extends DebugProtocol.SetFunctionBreakpointsResponse>(context: DebugContext, response: R, args: DebugProtocol.SetFunctionBreakpointsArguments): R => {
  return response;
};
