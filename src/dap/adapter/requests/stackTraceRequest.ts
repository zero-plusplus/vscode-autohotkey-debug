import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const stackTraceRequest = <R extends DebugProtocol.StackTraceResponse>(context: DebugContext, response: R, args: DebugProtocol.StackTraceArguments): R => {
  return response;
};
