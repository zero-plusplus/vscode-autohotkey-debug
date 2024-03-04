import { DebugProtocol } from '@vscode/debugprotocol';
import { ScriptRuntime } from '../../../types/dap/runtime/scriptRuntime.types';
import { createScriptRuntimeLauncher } from '../../runtime/launcher';
import { NormalizedDebugConfig } from '../../../types/dap/config.types';

export const launchRequest = async <R extends DebugProtocol.LaunchResponse>(config: NormalizedDebugConfig, response: R): Promise<[ ScriptRuntime, R ]> => {
  const launcher = createScriptRuntimeLauncher(config);
  const runtime = await launcher.launch();

  return Promise.resolve([ runtime, response ]);
};
