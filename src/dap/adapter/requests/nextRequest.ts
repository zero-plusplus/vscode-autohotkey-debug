import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const nextRequest = <R extends DebugProtocol.NextResponse>(context: DebugContext, response: R, args: DebugProtocol.NextArguments): R => {
  return response;
};
