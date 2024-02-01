import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const evaluateRequest = <R extends DebugProtocol.EvaluateResponse>(context: DebugContext, response: R, args: DebugProtocol.EvaluateArguments): R => {
  return response;
};
