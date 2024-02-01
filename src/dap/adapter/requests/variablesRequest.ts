import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const variablesRequest = <R extends DebugProtocol.VariablesResponse>(context: DebugContext, response: R, args: DebugProtocol.VariablesArguments): R => {
  return response;
};
