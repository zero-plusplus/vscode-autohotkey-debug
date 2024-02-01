import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const launchRequest = <R extends DebugProtocol.LaunchResponse>(context: DebugContext, response: R): R => {
  return response;
};
