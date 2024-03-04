import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const configurationDoneRequest = async <R extends DebugProtocol.ConfigurationDoneResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.ConfigurationDoneArguments): Promise<R> => {
  return Promise.resolve(response);
};
