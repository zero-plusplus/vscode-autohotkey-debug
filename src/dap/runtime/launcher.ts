import * as path from 'path';
import { createSessionConnector } from '../../dbgp/session';
import { ScriptRuntime, ScriptRuntimeLauncher } from '../../types/dap/runtime/scriptRuntime.types';
import { spawn } from 'child_process';
import { attachAutoHotkeyScript } from '../../tools/autohotkey';
import { NormalizedDebugConfig } from '../../types/dap/config.types';
import { Process } from '../../types/dap/session.types';
import { createScriptRuntime } from './scriptRuntime';

export const createScriptRuntimeLauncher = (config: NormalizedDebugConfig): ScriptRuntimeLauncher => {
  const connector = createSessionConnector();
  return {
    async launch(): Promise<ScriptRuntime> {
      const { noDebug, runtime, cwd, hostname, port, runtimeArgs, program, args, env, useUIAVersion } = config;

      const launchArgs = [
        ...(noDebug ? [] : [ `/Debug=${hostname}:${port}` ]),
        ...runtimeArgs,
        `${program}`,
        ...args,
      ];


      const process = (useUIAVersion
        ? spawn('cmd', [ '/c', '"', `"${runtime}"`, ...launchArgs, '"' ], { cwd: path.dirname(program), env, shell: true })
        : spawn(runtime, launchArgs, { cwd, env })) as Process;
      process.invocationCommand = `"${runtime}" ${launchArgs.join(' ')}`;
      const session = await connector.connect(config.port, config.hostname, process);
      return createScriptRuntime(session, config);
    },
    async attach(): Promise<ScriptRuntime> {
      const { runtime, program, hostname, port } = config;
      attachAutoHotkeyScript(runtime, program, hostname, port);

      const session = await connector.connect(config.port, config.hostname);
      return createScriptRuntime(session, config);
    },
  };
};
