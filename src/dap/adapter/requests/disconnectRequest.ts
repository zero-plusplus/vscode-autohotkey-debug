import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const disconnectRequest = async <R extends DebugProtocol.DisconnectRequest>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.DisconnectArguments): Promise<R> => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (adapter.runtime === undefined) {
    return response;
  }

  await adapter.runtime.close();
  return response;
};
