import { spawn, spawnSync } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import { LaunchRequestArguments } from '../ahkDebug';
import { getAhkVersion } from './getAhkVersion';
import { escapePcreRegExEscape } from './stringUtils';

export type AutoHotkeyProcess = {
  command: string;
  event: EventEmitter;
  close: () => void;
};

export class AutoHotkeyLauncher {
  private readonly launchRequest: LaunchRequestArguments;
  constructor(launchRequest: LaunchRequestArguments) {
    this.launchRequest = launchRequest;
  }
  public launch(): AutoHotkeyProcess {
    if (this.launchRequest.useUIAVersion) {
      return this.launchByCmd();
    }
    return this.launchByNode();
  }
  public launchByNode(): AutoHotkeyProcess {
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
  public launchByCmd(): AutoHotkeyProcess {
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
  public attach(): AutoHotkeyProcess | false {
    const { runtime, program, hostname, port } = this.launchRequest;

    const version = getAhkVersion(runtime);
    if (!version) {
      return false;
    }

    const ahkCode = version.mejor <= 1.1 ? `
      DetectHiddenWindows On
      SetTitleMatchMode RegEx
      if (WinExist("i)${escapePcreRegExEscape(program)} ahk_class AutoHotkey")) {
        PostMessage DllCall("RegisterWindowMessage", "Str", "AHK_ATTACH_DEBUGGER"), DllCall("ws2_32\\inet_addr", "astr", "${hostname}"), ${port}
        ExitApp
      }
      ExitApp 1
    ` : `
      A_DetectHiddenWindows := true
      SetTitleMatchMode("RegEx")
      if WinExist("i)${escapePcreRegExEscape(program)} ahk_class AutoHotkey") {
        PostMessage DllCall("RegisterWindowMessage",  "Str", "AHK_ATTACH_DEBUGGER"), DllCall("ws2_32\\inet_addr", "astr", "${hostname}"), ${port}
        ExitApp
      }
      ExitApp(1)
    `;
    const result = spawnSync(runtime, [ '/ErrorStdOut', '*' ], { input: ahkCode });
    if (result.error) {
      return false;
    }

    return {
      command: '',
      event: new EventEmitter(),
      close: (): void => {},
    };
  }
}
