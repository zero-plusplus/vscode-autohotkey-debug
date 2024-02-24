import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const threadsRequest = <R extends DebugProtocol.ThreadsResponse>(runtime: ScriptRuntime, response: R): R => {
  return response;
};
