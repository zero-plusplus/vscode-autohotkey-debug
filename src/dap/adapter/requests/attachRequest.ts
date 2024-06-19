import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';
import { AutoHotkeyDebugAdapter } from '../adapter';
import { attachDebug } from '../../runtime/launcher';
import { createScriptRuntime } from '../../runtime/scriptRuntime';

export const attachRequest = async <R extends DebugProtocol.AttachResponse>(adapter: AutoHotkeyDebugAdapter, response: R): Promise<[ ScriptRuntime, R ]> => {
  const session = await attachDebug(adapter.config);
  const runtime = createScriptRuntime(session);
  return Promise.resolve([ runtime, response ]);
};
