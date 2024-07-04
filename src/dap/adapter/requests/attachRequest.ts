import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/tools/autohotkey/runtime/scriptRuntime.types';
import { AutoHotkeyDebugAdapter } from '../adapter';
import { attachDebug } from '../../../tools/autohotkey/runtime/launcher';
import { createScriptRuntime } from '../../../tools/autohotkey/runtime/scriptRuntime';

export const attachRequest = async <R extends DebugProtocol.AttachResponse>(adapter: AutoHotkeyDebugAdapter, response: R): Promise<ScriptRuntime> => {
  const session = await attachDebug(adapter.config);
  return createScriptRuntime(session);
};
