import { DebugProtocol } from '@vscode/debugprotocol';

export const setVariableRequest = <R extends DebugProtocol.SetVariableResponse>(response: R, args: DebugProtocol.SetVariableArguments): R => {
  return response;
};
