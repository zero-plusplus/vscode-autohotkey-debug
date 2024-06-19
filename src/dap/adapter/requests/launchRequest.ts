import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';
import { startDebug } from '../../runtime/launcher';
import { AutoHotkeyDebugAdapter } from '../adapter';
import { createScriptRuntime } from '../../runtime/scriptRuntime';

export const launchRequest = async <R extends DebugProtocol.LaunchResponse>(adapter: AutoHotkeyDebugAdapter, response: R): Promise<[ ScriptRuntime, R ]> => {
  const session = await startDebug(adapter.config);
  const runtime = createScriptRuntime(session);

  return [ runtime, response ];
};
