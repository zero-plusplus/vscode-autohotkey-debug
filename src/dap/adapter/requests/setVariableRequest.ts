import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const setVariableRequest = <R extends DebugProtocol.SetVariableResponse>(context: DebugContext, response: R, args: DebugProtocol.SetVariableArguments): R => {
  return response;
};
