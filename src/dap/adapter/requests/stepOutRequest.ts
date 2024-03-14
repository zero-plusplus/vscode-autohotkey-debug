import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const stepOutRequest = async <R extends DebugProtocol.StepOutResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.StepOutArguments): Promise<R> => {
  const execResult = await adapter.runtime.stepOut();
  adapter.sendStoppedEvent(execResult);

  return Promise.resolve(response);
};
