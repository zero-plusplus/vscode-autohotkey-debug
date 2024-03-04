import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const disconnectRequest = async <R extends DebugProtocol.DisconnectRequest>(runtime: ScriptRuntime, response: R, args: DebugProtocol.DisconnectArguments): Promise<R> => {
  return Promise.resolve(response);
};
