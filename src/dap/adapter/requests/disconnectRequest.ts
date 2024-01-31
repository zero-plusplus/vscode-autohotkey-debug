import { DebugProtocol } from '@vscode/debugprotocol';

export const disconnectRequest = <R extends DebugProtocol.DisconnectRequest>(response: R, args: DebugProtocol.DisconnectArguments): R => {
  return response;
};
