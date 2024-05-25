import { DebugProtocol } from '@vscode/debugprotocol';
import { createScriptRuntimeLauncher } from '../../runtime/launcher';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const attachRequest = async <R extends DebugProtocol.AttachResponse>(adapter: AutoHotkeyDebugAdapter, response: R): Promise<[ ScriptRuntime, R ]> => {
  const launcher = createScriptRuntimeLauncher(adapter.config, adapter.eventManager);
  const runtime = await launcher.attach();

  return Promise.resolve([ runtime, response ]);
};
