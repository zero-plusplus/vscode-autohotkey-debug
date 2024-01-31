import { DebugProtocol } from '@vscode/debugprotocol';

export const completionsRequest = <R extends DebugProtocol.CompletionsResponse>(response: R, args: DebugProtocol.CompletionsArguments): R => {
  return response;
};
