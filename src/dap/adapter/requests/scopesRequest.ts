import { DebugProtocol } from '@vscode/debugprotocol';

export const scopesRequest = <R extends DebugProtocol.ScopesResponse>(response: R, args: DebugProtocol.ScopesArguments): R => {
  return response;
};
