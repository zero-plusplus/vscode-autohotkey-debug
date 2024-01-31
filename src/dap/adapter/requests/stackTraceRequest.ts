import { DebugProtocol } from '@vscode/debugprotocol';

export const stackTraceRequest = <R extends DebugProtocol.StackTraceResponse>(response: R, args: DebugProtocol.StackTraceArguments): R => {
  return response;
};
