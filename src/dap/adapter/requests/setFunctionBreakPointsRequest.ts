import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/tools/autohotkey/runtime/scriptRuntime.types';

export const setFunctionBreakPointsRequest = async <R extends DebugProtocol.SetFunctionBreakpointsResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.SetFunctionBreakpointsArguments): Promise<R> => {
  return Promise.resolve(response);
};
