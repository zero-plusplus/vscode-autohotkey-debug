import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const exceptionInfoRequest = async <R extends DebugProtocol.ExceptionInfoResponse>(runtime: ScriptRuntime, response: R, args: DebugProtocol.ExceptionInfoArguments): Promise<R> => {
  return Promise.resolve(response);
};
