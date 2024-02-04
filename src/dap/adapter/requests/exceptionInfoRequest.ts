import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/runtime';

export const exceptionInfoRequest = <R extends DebugProtocol.ExceptionInfoResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.ExceptionInfoArguments): R => {
  return response;
};
