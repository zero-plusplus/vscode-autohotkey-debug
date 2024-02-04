import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime';

export const continueRequest = <R extends DebugProtocol.ContinueResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.ContinueArguments): R => {
  return response;
};
