import { DebugProtocol } from '@vscode/debugprotocol';

export const continueRequest = <R extends DebugProtocol.ContinueResponse>(response: R, args: DebugProtocol.ContinueArguments): R => {
  return response;
};
