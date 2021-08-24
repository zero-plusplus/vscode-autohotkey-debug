import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import { LaunchRequestArguments } from '../ahkDebug';

export type AutoHotkeyScriptHandler = {
  command: string;
  event: EventEmitter;
  close: () => void;
};

export class AutoHotkeyLauncher {
  private readonly launchRequest: LaunchRequestArguments;
  constructor(launchRequest: LaunchRequestArguments) {
    this.launchRequest = launchRequest;
  }
  public launch(): AutoHotkeyScriptHandler {
    if (this.launchRequest.useUIAVersion) {
      return this.launchByCmd();
    }
    return this.launchByNode();
  }
  public launchByNode(): AutoHotkeyScriptHandler {
    const { noDebug, runtime, hostname, port, runtimeArgs, program, args, env } = this.launchRequest;

    const launchArgs = [
      ...(noDebug ? [] : [ `/Debug=${hostname}:${port}` ]),
      ...runtimeArgs,
      `${program}`,
      ...args,
    ];
    const event = new EventEmitter();
    const ahkProcess = spawn(runtime, launchArgs, { cwd: path.dirname(program), env });
    ahkProcess.on('close', (exitCode?: number) => {
      event.emit('close', exitCode);
    });
    ahkProcess.stdout.on('data', (data) => {
      event.emit('stdout', String(data));
    });
    ahkProcess.stderr.on('data', (data) => {
      event.emit('stderr', String(data));
    });

    return {
      command: `"${runtime}" ${launchArgs.join(' ')}\n`,
      event,
      close: (): void => {
        ahkProcess.kill();
      },
    };
  }
  public launchByCmd(): AutoHotkeyScriptHandler {
    const { noDebug, runtime, hostname, port, runtimeArgs, program, args, env } = this.launchRequest;
    const _runtimeArgs = runtimeArgs.filter((arg) => arg.toLowerCase() !== '/errorstdout');
    const launchArgs = [
      ...(noDebug ? [] : [ `/Debug=${hostname}:${port}` ]),
      ..._runtimeArgs,
      `"${program}"`,
      ...args,
    ];

    const event = new EventEmitter();
    const ahkProcess = spawn('cmd', [ '/c', '"', `"${runtime}"`, ...launchArgs, '"' ], { cwd: path.dirname(program), env, shell: true });
    ahkProcess.on('close', (exitCode?: number) => {
      event.emit('close', exitCode);
    });
    ahkProcess.stdout.on('data', (data) => {
      event.emit('stdout', String(data));
    });
    ahkProcess.stderr.on('data', (data) => {
      event.emit('stderr', String(data));
    });
    return {
      command: `"${runtime}" ${launchArgs.join(' ')}\n`,
      event,
      close: (): void => {
        ahkProcess.kill();
      },
    };
  }
}
