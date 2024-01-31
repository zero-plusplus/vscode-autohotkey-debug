import { DebugProtocol } from '@vscode/debugprotocol';

export const launchRequest = <R extends DebugProtocol.LaunchResponse>(response: R, args: DebugProtocol.LaunchRequestArguments): R => {
  return response;
};
