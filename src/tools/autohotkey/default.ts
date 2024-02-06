import * as path from 'path';

export const defaultHostName = 'localhost'; export const defaultPort = 9002;
export const defaultAutoHotkeyInstallDir = path.resolve(String(process.env.PROGRAMFILES), 'AutoHotkey');
export const defaultAutoHotkeyRuntimePath_v1 = path.resolve(defaultAutoHotkeyInstallDir, 'AutoHotkey.exe');
export const defaultAutoHotkeyRuntimePath_v2 = path.resolve(defaultAutoHotkeyInstallDir, 'v2', 'AutoHotkey.exe');
export const defaultAutoHotkeyUxDirPath = path.resolve(`${defaultAutoHotkeyInstallDir}/UX`);
export const defaultAutoHotkeyUxRuntimePath = path.resolve(`${defaultAutoHotkeyUxDirPath}`, 'AutoHotkeyUX.exe');
export const defaultAutoHotkeyLauncherPath = path.resolve(`${defaultAutoHotkeyUxDirPath}`, '/launcher.ahk');

