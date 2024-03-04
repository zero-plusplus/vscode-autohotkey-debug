import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const scopesRequest = async <R extends DebugProtocol.ScopesResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.ScopesArguments): Promise<R> => {
  return Promise.resolve(response);
};
