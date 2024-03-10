import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const configurationDoneRequest = async <R extends DebugProtocol.ConfigurationDoneResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.ConfigurationDoneArguments): Promise<R> => {
  if (adapter.config.stopOnEntry) {
    adapter.sendStoppedEvent('entry');
    return response;
  }

  const execResult = await adapter.runtime.exec('run');
  adapter.sendStoppedEvent(execResult);
  return response;
};
