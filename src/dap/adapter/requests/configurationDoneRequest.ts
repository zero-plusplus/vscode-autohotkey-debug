import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const configurationDoneRequest = <R extends DebugProtocol.ConfigurationDoneResponse>(context: DebugContext, response: R, args: DebugProtocol.ConfigurationDoneArguments): R => {
  return response;
};
