import * as path from 'path';
import { createSessionConnector } from '../../dbgp/session';
import { ScriptRuntime, ScriptRuntimeLauncher } from '../../types/dap/runtime/scriptRuntime.types';
import { spawn } from 'child_process';
import { attachAutoHotkeyScript } from '../../tools/autohotkey';
import { NormalizedDebugConfig } from '../../types/dap/config.types';
import { AutoHotkeyProcess } from '../../types/dbgp/session.types';
import { createScriptRuntime } from './scriptRuntime';
import { EventManager } from '../../types/dbgp/event.types';
import { createEventManager } from '../../dbgp/event';

export const launchAutoHotkeyProcess = (config: Readonly<NormalizedDebugConfig>): AutoHotkeyProcess => {
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
  process.isTerminated = false;
  process.program = program;
  process.invocationCommand = `"${runtime}" ${launchArgs.join(' ')}`;
  return process;
};
export const createScriptRuntimeLauncher = (config: Readonly<NormalizedDebugConfig>, eventManager: EventManager = createEventManager()): ScriptRuntimeLauncher => {
  const connector = createSessionConnector(eventManager);
  return {
    async launch(): Promise<ScriptRuntime> {
      const process = launchAutoHotkeyProcess(config);
      eventManager.registerProcessEvent(process);

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

