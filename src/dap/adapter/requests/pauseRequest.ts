import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const pauseRequest = async <R extends DebugProtocol.PauseResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.PauseArguments): Promise<R> => {
  await adapter.runtime.pause();
  adapter.sendStoppedEvent('pause');

  return response;
};
