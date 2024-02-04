import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime';

export const variablesRequest = <R extends DebugProtocol.VariablesResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.VariablesArguments): R => {
  return response;
};
