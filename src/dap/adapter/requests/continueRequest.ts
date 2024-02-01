import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const continueRequest = <R extends DebugProtocol.ContinueResponse>(context: DebugContext, response: R, args: DebugProtocol.ContinueArguments): R => {
  return response;
};
