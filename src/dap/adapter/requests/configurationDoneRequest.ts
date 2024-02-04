import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime';

export const configurationDoneRequest = <R extends DebugProtocol.ConfigurationDoneResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.ConfigurationDoneArguments): R => {
  return response;
};
