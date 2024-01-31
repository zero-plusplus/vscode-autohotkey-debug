import { DebugProtocol } from '@vscode/debugprotocol';

export const exceptionInfoRequest = <R extends DebugProtocol.ExceptionInfoResponse>(response: R, args: DebugProtocol.ExceptionInfoArguments): R => {
  return response;
};
