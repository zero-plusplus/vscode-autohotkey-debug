import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const exceptionInfoRequest = async <R extends DebugProtocol.ExceptionInfoResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.ExceptionInfoArguments): Promise<R> => {
  return Promise.resolve(response);
};
