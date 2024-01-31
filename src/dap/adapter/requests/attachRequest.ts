import { DebugProtocol } from '@vscode/debugprotocol';

export const attachRequest = <R extends DebugProtocol.AttachResponse>(response: R, args: DebugProtocol.AttachRequestArguments): R => {
  return response;
};
