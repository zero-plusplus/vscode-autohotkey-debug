import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const threadsRequest = <R extends DebugProtocol.ThreadsResponse>(context: DebugContext, response: R): R => {
  return response;
};
