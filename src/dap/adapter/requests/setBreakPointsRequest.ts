import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const setBreakPointsRequest = <R extends DebugProtocol.SetBreakpointsResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.SetBreakpointsArguments): R => {
  return response;
};
