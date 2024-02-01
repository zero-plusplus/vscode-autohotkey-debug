import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const scopesRequest = <R extends DebugProtocol.ScopesResponse>(context: DebugContext, response: R, args: DebugProtocol.ScopesArguments): R => {
  return response;
};
