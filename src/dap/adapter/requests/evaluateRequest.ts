import { DebugProtocol } from '@vscode/debugprotocol';

export const evaluateRequest = <R extends DebugProtocol.EvaluateResponse>(response: R, args: DebugProtocol.EvaluateArguments): R => {
  return response;
};
