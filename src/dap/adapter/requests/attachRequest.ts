import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const attachRequest = async <R extends DebugProtocol.AttachResponse>(runtime: ScriptRuntime, response: R): Promise<R> => {
  return Promise.resolve(response);
};
