import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime';

export const setVariableRequest = <R extends DebugProtocol.SetVariableResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.SetVariableArguments): R => {
  return response;
};
