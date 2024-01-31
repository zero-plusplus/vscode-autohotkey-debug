import { DebugProtocol } from '@vscode/debugprotocol';

export const variablesRequest = <R extends DebugProtocol.VariablesResponse>(response: R, args: DebugProtocol.VariablesArguments): R => {
  return response;
};
