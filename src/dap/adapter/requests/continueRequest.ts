import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const continueRequest = async <R extends DebugProtocol.ContinueResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.ContinueArguments): Promise<R> => {
  const execResult = await adapter.runtime.run();
  adapter.sendStoppedEvent(execResult);

  return response;
};
