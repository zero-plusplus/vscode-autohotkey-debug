import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const setExpressionRequest = <R extends DebugProtocol.SetExpressionResponse>(context: DebugContext, response: R, args: DebugProtocol.SetExpressionArguments): R => {
  return response;
};
