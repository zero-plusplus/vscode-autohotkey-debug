import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const attachRequest = <R extends DebugProtocol.AttachResponse>(runtime: ScriptRuntime, response: R): R => {
  return response;
};
