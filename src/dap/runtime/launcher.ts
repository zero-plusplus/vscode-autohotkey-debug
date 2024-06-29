import * as path from 'path';
import { createDebugServer } from '../../dbgp/session';
import { ScriptRuntime, ScriptRuntimeLauncher } from '../../types/dap/runtime/scriptRuntime.types';
import { spawn } from 'child_process';
import { attachAutoHotkeyScript } from '../../tools/autohotkey';
import { NormalizedDebugConfig } from '../../types/dap/config.types';
import { AutoHotkeyProcess, Session } from '../../types/dbgp/session.types';
import { createScriptRuntime } from './scriptRuntime';

export function launchAutoHotkeyProcess(config: Readonly<NormalizedDebugConfig>): AutoHotkeyProcess {
  const { noDebug, runtime, cwd, hostname, port, runtimeArgs, program, args, env, useUIAVersion } = config;

  const launchArgs = [
    ...(noDebug ? [] : [ `/Debug=${hostname}:${port}` ]),
    ...runtimeArgs,
    program,
    ...args,
  ];

  const process = (useUIAVersion
    ? spawn('cmd', [ '/c', '"', `"${runtime}"`, ...launchArgs, '"' ], { cwd: path.dirname(program), env, shell: true })
    : spawn(runtime, launchArgs, { cwd, env })) as AutoHotkeyProcess;
  process.isTerminated = false;
  process.program = program;
  process.invocationCommand = `"${runtime}" ${launchArgs.join(' ')}`;
  return process;
}

export async function startDebug(config: Readonly<NormalizedDebugConfig>): Promise<Session> {
  const process = launchAutoHotkeyProcess(config);

  const server = createDebugServer(process);
  return server.listen(config.port, config.hostname);
}
export async function attachDebug(config: Readonly<NormalizedDebugConfig>): Promise<Session> {
  const { runtime, program, hostname, port } = config;
  attachAutoHotkeyScript(runtime, program, hostname, port);

  const server = createDebugServer();
  return server.listen(config.port, config.hostname);
}
export const createScriptRuntimeLauncher = (config: Readonly<NormalizedDebugConfig>): ScriptRuntimeLauncher => {
  return {
    async launch(): Promise<ScriptRuntime> {
      const session = await startDebug(config);
      return createScriptRuntime(session);
    },
    async attach(): Promise<ScriptRuntime> {
      const session = await attachDebug(config);
      return createScriptRuntime(session);
    },
  };
};

