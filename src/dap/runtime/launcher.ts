import * as path from 'path';
import { createSessionConnector } from '../../dbgp/session';
import { ScriptRuntime, ScriptRuntimeLauncher } from '../../types/dap/runtime/scriptRuntime.types';
import { spawn } from 'child_process';
import { attachAutoHotkeyScript } from '../../tools/autohotkey';
import { NormalizedDebugConfig } from '../../types/dap/config.types';
import { Process } from '../../types/dbgp/session.types';
import { createScriptRuntime } from './scriptRuntime';

export const createScriptRuntimeLauncher = (config: NormalizedDebugConfig): ScriptRuntimeLauncher => {
  const connector = createSessionConnector();
  return {
    async launch(): Promise<ScriptRuntime> {
      return new Promise((resolve) => {
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
        connector.connect(config.port, config.hostname, process).then((session) => {
          session.once('debugger:init', () => {
            resolve(createScriptRuntime(session, config));
          });
        });
      });
    },
    async attach(): Promise<ScriptRuntime> {
      return new Promise((resolve) => {
        const { runtime, program, hostname, port } = config;
        attachAutoHotkeyScript(runtime, program, hostname, port);

        connector.connect(config.port, config.hostname).then((session) => {
          session.once('debugger:init', () => {
            resolve(createScriptRuntime(session, config));
          });
        });
      });
    },
  };
};
