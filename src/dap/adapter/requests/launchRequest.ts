import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/tools/autohotkey/runtime/scriptRuntime.types';
import { startDebug } from '../../../tools/autohotkey/runtime/launcher';
import { AutoHotkeyDebugAdapter } from '../adapter';
import { createScriptRuntime } from '../../../tools/autohotkey/runtime/scriptRuntime';

export const launchRequest = async <R extends DebugProtocol.LaunchResponse>(adapter: AutoHotkeyDebugAdapter, response: R): Promise<ScriptRuntime> => {
  const session = await startDebug(adapter.config).listen(adapter.config.port, adapter.config.hostname);
  return createScriptRuntime(session);
};
