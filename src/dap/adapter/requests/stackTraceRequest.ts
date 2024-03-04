import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const stackTraceRequest = async <R extends DebugProtocol.StackTraceResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.StackTraceArguments): Promise<R> => {
  return Promise.resolve(response);
};
