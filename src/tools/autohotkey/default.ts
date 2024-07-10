import * as path from 'path';

export const defaultHostName = 'localhost';
export const defaultPort = 9002;
export const defaultAutoHotkeyInstallDir: string = path.resolve(String(process.env.PROGRAMFILES), 'AutoHotkey');
export const defaultAutoHotkeyRuntimeDir_v2: string = path.resolve(String(process.env.PROGRAMFILES), 'AutoHotkey', 'v2');
export const defaultAutoHotkeyRuntimePath_v1: string = path.resolve(defaultAutoHotkeyInstallDir, 'AutoHotkey.exe');
export const defaultAutoHotkeyRuntimePath_v2: string = path.resolve(defaultAutoHotkeyRuntimeDir_v2, 'AutoHotkey.exe');
export const defaultAutoHotkeyUxDirPath: string = path.resolve(`${defaultAutoHotkeyInstallDir}/UX`);
export const defaultAutoHotkeyUxRuntimePath: string = path.resolve(defaultAutoHotkeyUxDirPath, 'AutoHotkeyUX.exe');
export const defaultAutoHotkeyLauncherPath: string = path.resolve(defaultAutoHotkeyUxDirPath, '/launcher.ahk');

