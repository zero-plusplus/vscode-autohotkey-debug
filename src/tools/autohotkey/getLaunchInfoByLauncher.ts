import * as path from 'path';
import { spawnSync } from 'child_process';
import { fileExists } from '../predicate';
import { defaultAutoHotkeyInstallDir } from './';

export const getLaunchInfoByLauncher = (program: string, installDir: string = defaultAutoHotkeyInstallDir): { requires: string; runtime: string; args: string[] } | undefined => {
  if (!fileExists(program)) {
    return undefined;
  }
  const autohotkeyUxRuntimePath = path.resolve(installDir, 'UX', 'AutoHotkeyUX.exe');
  if (!fileExists(autohotkeyUxRuntimePath)) {
    return undefined;
  }
  const autohotkeyLauncherPath = path.resolve(installDir, 'UX', 'launcher.ahk');
  if (!fileExists(autohotkeyLauncherPath)) {
    return undefined;
  }

  const result = spawnSync(autohotkeyUxRuntimePath, [ autohotkeyLauncherPath, '/Which', program ]);
  if (result.error) {
    return undefined;
  }

  const [ requires, runtime, ...args ] = result.stdout.toString().split(/\r\n|\n/u);
  return { requires, runtime, args: args.filter((arg) => arg !== '') };
};
