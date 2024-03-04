import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const threadsRequest = async <R extends DebugProtocol.ThreadsResponse>(runtime: ScriptRuntime, response: R): Promise<R> => {
  return Promise.resolve(response);
};
