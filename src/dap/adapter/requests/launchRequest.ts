import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';
import { createScriptRuntimeLauncher } from '../../runtime/launcher';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const launchRequest = async <R extends DebugProtocol.LaunchResponse>(adapter: AutoHotkeyDebugAdapter, response: R): Promise<[ ScriptRuntime, R ]> => {
  const launcher = createScriptRuntimeLauncher(adapter.config, adapter.eventManager);
  const runtime = await launcher.launch();

  return [ runtime, response ];
};
