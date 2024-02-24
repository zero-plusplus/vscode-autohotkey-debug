import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const setFunctionBreakPointsRequest = <R extends DebugProtocol.SetFunctionBreakpointsResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.SetFunctionBreakpointsArguments): R => {
  return response;
};
