import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/runtime';

export const completionsRequest = <R extends DebugProtocol.CompletionsResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.CompletionsArguments): R => {
  return response;
};
