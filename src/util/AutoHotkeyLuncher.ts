import { tmpdir } from 'os';
import { unlinkSync, writeFileSync } from 'fs';
import { spawn, spawnSync } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import temp from 'temp';
import { LaunchRequestArguments } from '../ahkDebug';
import { getAhkVersion } from './getAhkVersion';
import { equalsIgnoreCase, escapePcreRegExEscape } from './stringUtils';

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
    const { noDebug, runtime, cwd, hostname, port, runtimeArgs, program, args, env, includeFiles } = this.launchRequest;

    let tempIncludeFile: string | undefined;
    const includeFile = includeFiles.length === 1 ? includeFiles[0] : '';
    if (1 < includeFiles.length) {
      const script = includeFiles
        .map((file) => `#Include ${file.replaceAll('/', '\\')}`)
        .join('\r\n');
      tempIncludeFile = path.resolve(temp.path({ suffix: '.ahk' }));
      writeFileSync(tempIncludeFile, script, 'utf-8');
    }

    const launchArgs = [
      ...(noDebug ? [] : [ `/Debug=${hostname}:${port}` ]),
      ...runtimeArgs,
      ...(includeFile === '' ? [] : [ '/include', tempIncludeFile ?? includeFile ]),
      `${program}`,
      ...args,
    ];

    const event = new EventEmitter();
    const ahkProcess = spawn(runtime, launchArgs, { cwd, env });
    ahkProcess.on('close', (exitCode?: number) => {
      // The process deletes file, so check excessively
      if (tempIncludeFile && equalsIgnoreCase(tmpdir().toLowerCase(), path.dirname(tempIncludeFile))) {
        try {
          unlinkSync(tempIncludeFile);
        }
        catch (err: unknown) {
          if (err instanceof Error) {
            console.log(err.message);
          }
        }
      }
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
