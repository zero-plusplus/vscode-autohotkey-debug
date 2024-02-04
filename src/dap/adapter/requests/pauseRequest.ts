import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/runtime';

export const pauseRequest = <R extends DebugProtocol.PauseResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.PauseArguments): R => {
  return response;
};
