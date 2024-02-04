import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime';

export const disconnectRequest = <R extends DebugProtocol.DisconnectRequest>(runtime: ScriptRuntime, response: R, args: DebugProtocol.DisconnectArguments): R => {
  return response;
};
