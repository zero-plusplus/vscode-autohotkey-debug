import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const disconnectRequest = async <R extends DebugProtocol.DisconnectRequest>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.DisconnectArguments): Promise<R> => {
  await adapter.runtime.close();
  return Promise.resolve(response);
};
