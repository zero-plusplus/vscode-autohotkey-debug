import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const stepInTargetsRequest = <R extends DebugProtocol.StepInTargetsResponse>(context: DebugContext, response: R, args: DebugProtocol.StepInTargetsArguments): R => {
  return response;
};
