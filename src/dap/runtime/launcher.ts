import * as path from 'path';
import { createSessionConnector } from '../../dbgp/session';
import { ScriptRuntime, ScriptRuntimeLauncher } from '../../types/dap/runtime/scriptRuntime.types';
import { spawn } from 'child_process';
import { attachAutoHotkeyScript } from '../../tools/autohotkey';
import { NormalizedDebugConfig } from '../../types/dap/config.types';
import { AutoHotkeyProcess } from '../../types/dbgp/session.types';
import { createScriptRuntime } from './scriptRuntime';
import EventEmitter from 'events';

export const createScriptRuntimeLauncher = (eventEmitter: Readonly<EventEmitter>, config: Readonly<NormalizedDebugConfig>): ScriptRuntimeLauncher => {
  const connector = createSessionConnector(eventEmitter);
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
          : spawn(runtime, launchArgs, { cwd, env })) as AutoHotkeyProcess;
        process.program = program;
        process.invocationCommand = `"${runtime}" ${launchArgs.join(' ')}`;
        process.on('close', (exitCode?: number) => {
          eventEmitter.emit('process:close', exitCode);
        });
        process.on('error', (exitCode?: number) => {
          eventEmitter.emit('process:error', exitCode);
        });
        process.stdout.on('data', (data) => {
          eventEmitter.emit('process:message', 'stdout', data ? String(data) : undefined);
        });
        process.stderr.on('data', (data?) => {
          eventEmitter.emit('process:message', 'stderr', data ? String(data) : undefined);
        });
        connector.connect(config.port, config.hostname, process).then((session) => {
          eventEmitter.once('debugger:init', () => {
            resolve(createScriptRuntime(session, eventEmitter, config));
          });
        });
      });
    },
    async attach(): Promise<ScriptRuntime> {
      return new Promise((resolve) => {
        const { runtime, program, hostname, port } = config;
        attachAutoHotkeyScript(runtime, program, hostname, port);

        connector.connect(config.port, config.hostname).then((session) => {
          eventEmitter.once('debugger:init', () => {
            resolve(createScriptRuntime(session, eventEmitter, config));
          });
        });
      });
    },
  };
};
