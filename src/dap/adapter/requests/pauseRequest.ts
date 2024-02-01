import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugContext } from '../../../types/dap/adapter';

export const pauseRequest = <R extends DebugProtocol.PauseResponse>(context: DebugContext, response: R, args: DebugProtocol.PauseArguments): R => {
  return response;
};
