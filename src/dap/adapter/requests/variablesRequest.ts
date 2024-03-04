import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const variablesRequest = async <R extends DebugProtocol.VariablesResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.VariablesArguments): Promise<R> => {
  return Promise.resolve(response);
};
