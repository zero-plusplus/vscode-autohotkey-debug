import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const setExceptionBreakPointsRequest = async <R extends DebugProtocol.SetExceptionBreakpointsResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.SetExceptionBreakpointsArguments): Promise<R> => {
  return Promise.resolve(response);
};
