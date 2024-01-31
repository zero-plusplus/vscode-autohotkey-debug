import { DebugProtocol } from '@vscode/debugprotocol';

export const pauseRequest = <R extends DebugProtocol.PauseResponse>(response: R, args: DebugProtocol.PauseArguments): R => {
  return response;
};
