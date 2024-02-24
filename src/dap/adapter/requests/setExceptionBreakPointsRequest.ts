import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const setExceptionBreakPointsRequest = <R extends DebugProtocol.SetExceptionBreakpointsResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.SetExceptionBreakpointsArguments): R => {
  return response;
};
