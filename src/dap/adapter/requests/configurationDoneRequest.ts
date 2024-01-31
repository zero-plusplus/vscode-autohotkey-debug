import { DebugProtocol } from '@vscode/debugprotocol';

export const configurationDoneRequest = <R extends DebugProtocol.ConfigurationDoneResponse>(response: R, args: DebugProtocol.ConfigurationDoneArguments): R => {
  return response;
};
