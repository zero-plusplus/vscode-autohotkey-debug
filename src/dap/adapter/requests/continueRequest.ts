import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const continueRequest = async <R extends DebugProtocol.ContinueResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.ContinueArguments): Promise<R> => {
  return Promise.resolve(response);
};
