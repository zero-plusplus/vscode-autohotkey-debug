import * as path from 'path';
import { createDebugServer } from '../../../dbgp/session';
import { ScriptRuntime, ScriptRuntimeLauncher } from '../../../types/tools/autohotkey/runtime/scriptRuntime.types';
import { spawn } from 'child_process';
import { attachAutoHotkeyScript } from '..';
import { DebugConfig } from '../../../types/dap/config.types';
import { AutoHotkeyProcess, DebugServer } from '../../../types/dbgp/session.types';
import { createScriptRuntime } from './scriptRuntime';

export function launchAutoHotkeyProcess(config: DebugConfig): AutoHotkeyProcess {
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

export function startDebug(config: DebugConfig): DebugServer {
  const process = launchAutoHotkeyProcess(config);
  return createDebugServer(process);
}
export function attachDebug(config: DebugConfig): DebugServer {
  const { runtime, program, hostname, port } = config;
  attachAutoHotkeyScript(runtime, program, hostname, port);

  return createDebugServer();
}
export const createScriptRuntimeLauncher = (config: DebugConfig): ScriptRuntimeLauncher => {
  return {
    async launch(): Promise<ScriptRuntime> {
      const session = await startDebug(config).listen(config.port, config.hostname);
      return createScriptRuntime(session);
    },
    async attach(): Promise<ScriptRuntime> {
      const session = await attachDebug(config).listen(config.port, config.hostname);
      return createScriptRuntime(session);
    },
  };
};

