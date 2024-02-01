import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const attachRequest = <R extends DebugProtocol.AttachResponse>(context: DebugContext, response: R): R => {
  return response;
};
