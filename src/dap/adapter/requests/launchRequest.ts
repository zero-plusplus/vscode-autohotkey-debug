import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/runtime';

export const launchRequest = <R extends DebugProtocol.LaunchResponse>(runtime: ScriptRuntime, response: R): R => {
  return response;
};
