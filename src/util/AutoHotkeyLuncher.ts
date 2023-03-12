import * as path from 'path';
import { existsSync } from 'fs';
import { SpawnSyncOptions, spawn, spawnSync } from 'child_process';
import { EventEmitter } from 'events';
import { LaunchRequestArguments } from '../ahkDebug';
import { escapePcreRegExEscape } from './stringUtils';
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';

export type AutoHotkeyProcess = {
  command: string;
  event: EventEmitter;
  close: () => void;
};

export const defaultAutoHotkeyInstallDir = `${String(process.env.PROGRAMFILES)}/AutoHotkey`;
export const getAutohotkeyUxRuntimePath = (installDir = defaultAutoHotkeyInstallDir): string => {
  return path.resolve(`${installDir}/UX/AutoHotkeyUX.exe`);
};
export const getAutohotkeyLauncherPath = (installDir = defaultAutoHotkeyInstallDir): string => {
  return path.resolve(`${installDir}/UX/launcher.ahk`);
};
export const getAhkVersion = (ahkRuntime: string, options?: SpawnSyncOptions): AhkVersion | undefined => {
  const ahkCode = 'FileOpen("*", "w", "CP65001").write(A_AhkVersion)';
  const result = spawnSync(ahkRuntime, [ '/ErrorStdOut', '*' ], { ...options, input: ahkCode });
  if (result.error) {
    return undefined;
  }
  const version = result.stdout.toString();
  return new AhkVersion(version);
};

export interface LaunchInfo {
  requires: string;
  runtime: string;
  args: string[];
}
export const getLaunchInfoByLauncher = (program: string, installDir = `${String(process.env.PROGRAMFILES)}/AutoHotkey/UX`): LaunchInfo | undefined => {
  const autohotkeyUxRuntimePath = getAutohotkeyUxRuntimePath(installDir);
  const autohotkeyLauncherPath = getAutohotkeyLauncherPath(installDir);
  if (!existsSync(autohotkeyUxRuntimePath)) {
    return undefined;
  }
  if (!existsSync(autohotkeyLauncherPath)) {
    return undefined;
  }
  if (!existsSync(program)) {
    return undefined;
  }

  const result = spawnSync(autohotkeyUxRuntimePath, [ autohotkeyLauncherPath, '/Which', program ]);
  if (result.error) {
    return undefined;
  }

  const [ requires, runtime, ...args ] = result.stdout.toString().split(/\r\n|\n/u);
  return { requires, runtime, args: args.filter((arg) => arg !== '') };
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
    const { noDebug, runtime, cwd, hostname, port, runtimeArgs, program, args, env } = this.launchRequest;

    const launchArgs = [
      ...(noDebug ? [] : [ `/Debug=${hostname}:${port}` ]),
      ...runtimeArgs,
      `${program}`,
      ...args,
    ];
    const event = new EventEmitter();
    const ahkProcess = spawn(runtime, launchArgs, { cwd, env });
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
      command: `"${runtime}" ${launchArgs.join(' ')}`,
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
      command: `"${runtime}" ${launchArgs.join(' ')}`,
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
    const result = spawnSync(runtime, [ '/ErrorStdOut', '/CP65001', '*' ], { input: ahkCode });
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
