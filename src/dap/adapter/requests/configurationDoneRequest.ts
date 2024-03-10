import { DebugProtocol } from '@vscode/debugprotocol';
import { StoppedEvent } from '@vscode/debugadapter';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const configurationDoneRequest = async <R extends DebugProtocol.ConfigurationDoneResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.ConfigurationDoneArguments): Promise<R> => {
  if (adapter.config.stopOnEntry) {
    adapter.sendEvent(new StoppedEvent(''));
    return response;
  }

  await adapter.runtime.run();
  return response;
};
