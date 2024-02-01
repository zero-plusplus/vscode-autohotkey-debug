import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const stepInRequest = <R extends DebugProtocol.StepInResponse>(context: DebugContext, response: R, args: DebugProtocol.StepInArguments): R => {
  return response;
};
