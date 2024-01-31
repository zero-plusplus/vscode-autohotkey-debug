import { DebugProtocol } from '@vscode/debugprotocol';

export const setExpressionRequest = <R extends DebugProtocol.SetExpressionResponse>(response: R, args: DebugProtocol.SetExpressionArguments): R => {
  return response;
};
