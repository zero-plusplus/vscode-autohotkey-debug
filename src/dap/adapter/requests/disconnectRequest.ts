import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const disconnectRequest = async <R extends DebugProtocol.DisconnectRequest>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.DisconnectArguments): Promise<R> => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (adapter.runtime === undefined) {
    adapter.isTerminateRequested = true;
    return response;
  }

  await adapter.runtime.close();

  // eslint-disable-next-line require-atomic-updates
  adapter.isTerminateRequested = true;
  return response;
};
