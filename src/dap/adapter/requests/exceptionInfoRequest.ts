import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const exceptionInfoRequest = <R extends DebugProtocol.ExceptionInfoResponse>(context: DebugContext, response: R, args: DebugProtocol.ExceptionInfoArguments): R => {
  return response;
};
