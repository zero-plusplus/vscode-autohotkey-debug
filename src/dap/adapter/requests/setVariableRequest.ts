import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const setVariableRequest = async <R extends DebugProtocol.SetVariableResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.SetVariableArguments): Promise<R> => {
  return Promise.resolve(response);
};
