import { DebugProtocol } from '@vscode/debugprotocol';

export const stepInTargetsRequest = <R extends DebugProtocol.StepInTargetsResponse>(response: R, args: DebugProtocol.StepInTargetsArguments): R => {
  return response;
};
