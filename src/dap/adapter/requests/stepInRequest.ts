import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const stepInRequest = async <R extends DebugProtocol.StepInResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.StepInArguments): Promise<R> => {
  const execResult = await adapter.runtime.stepIn();
  adapter.sendStoppedEvent(execResult);

  return Promise.resolve(response);
};
