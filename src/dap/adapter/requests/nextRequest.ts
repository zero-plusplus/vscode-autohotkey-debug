import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const nextRequest = async <R extends DebugProtocol.NextResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.NextArguments): Promise<R> => {
  const execResult = await adapter.runtime.stepOver();
  adapter.sendStoppedEvent(execResult);

  return response;
};
