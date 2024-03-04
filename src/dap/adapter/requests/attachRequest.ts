import { DebugProtocol } from '@vscode/debugprotocol';
import { NormalizedDebugConfig } from '../../../types/dap/config.types';
import { createScriptRuntimeLauncher } from '../../runtime/launcher';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';

export const attachRequest = async <R extends DebugProtocol.AttachResponse>(config: NormalizedDebugConfig, response: R): Promise<[ ScriptRuntime, R ]> => {
  const launcher = createScriptRuntimeLauncher(config);
  const runtime = await launcher.attach();

  return Promise.resolve([ runtime, response ]);
};
