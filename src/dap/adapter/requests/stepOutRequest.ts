import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const stepOutRequest = <R extends DebugProtocol.StepOutResponse>(context: DebugContext, response: R, args: DebugProtocol.StepOutArguments): R => {
  return response;
};
