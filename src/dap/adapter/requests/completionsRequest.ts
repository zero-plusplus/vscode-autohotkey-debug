import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const completionsRequest = <R extends DebugProtocol.CompletionsResponse>(context: DebugContext, response: R, args: DebugProtocol.CompletionsArguments): R => {
  return response;
};
