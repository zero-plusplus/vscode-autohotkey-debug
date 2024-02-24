import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const setVariableRequest = <R extends DebugProtocol.SetVariableResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.SetVariableArguments): R => {
  return response;
};
