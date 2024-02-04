import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime';

export const stackTraceRequest = <R extends DebugProtocol.StackTraceResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.StackTraceArguments): R => {
  return response;
};
