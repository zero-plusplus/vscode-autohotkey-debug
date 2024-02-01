import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const disconnectRequest = <R extends DebugProtocol.DisconnectRequest>(context: DebugContext, response: R, args: DebugProtocol.DisconnectArguments): R => {
  return response;
};
