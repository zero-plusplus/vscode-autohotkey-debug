import { DebugProtocol } from '@vscode/debugprotocol';

export const stepInRequest = <R extends DebugProtocol.StepInResponse>(response: R, args: DebugProtocol.StepInArguments): R => {
  return response;
};
