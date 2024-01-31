import { DebugProtocol } from '@vscode/debugprotocol';

export const stepOutRequest = <R extends DebugProtocol.StepOutResponse>(response: R, args: DebugProtocol.StepOutArguments): R => {
  return response;
};
