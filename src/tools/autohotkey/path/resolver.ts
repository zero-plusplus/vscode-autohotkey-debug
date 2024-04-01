import * as path from 'path';
import { AutoHotkeyEnvironments, AutoHotkeyEnvironments_v1, AutoHotkeyEnvironments_v2, PartialedAutoHotkeyEnvironments, PartialedAutoHotkeyEnvironments_v1, PartialedAutoHotkeyEnvironments_v2 } from '../../../types/tools/autohotkey/path/resolver.types';
import { AutoHotkeyVersion, ParsedAutoHotkeyVersion } from '../../../types/tools/autohotkey/version/common.types';
import { parseAutoHotkeyVersion } from '../version';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createPathResolver = (rawVersion: AutoHotkeyVersion | ParsedAutoHotkeyVersion, rawEnv: PartialedAutoHotkeyEnvironments) => {
  const version = typeof rawVersion === 'string' ? parseAutoHotkeyVersion(rawVersion) : rawVersion;
  const env = createAutoHotkeyEnvironments(rawEnv);

  let cwd: string | undefined;
  return {
    resetCurrentDirectory(): void {
      cwd = undefined;
    },
    setCurrentDirectory(newCwd: string): void {
      cwd = newCwd;
    },
    get cwd(): string | undefined {
      if (cwd) {
        return cwd;
      }

      if (env.A_ScriptDir) {
        return path.resolve(env.A_ScriptDir);
      }
      if (env.A_LineFile) {
        return path.dirname(env.A_LineFile);
      }
      return undefined;
    },
    resolve(rawPath: string): string {
      const expandedPath = expandVariable(rawPath);
      return toFullPath(expandedPath, this.cwd);
    },
  };

  function createAutoHotkeyEnvironments(env: PartialedAutoHotkeyEnvironments): AutoHotkeyEnvironments {
    if (2 <= version.mejor) {
      return createAutoHotkeyEnvironments_v2(env as PartialedAutoHotkeyEnvironments_v2);
    }
    return createAutoHotkeyEnvironments_v1(env as PartialedAutoHotkeyEnvironments_v1);

    function createAutoHotkeyEnvironments_v1(env: PartialedAutoHotkeyEnvironments_v1): AutoHotkeyEnvironments_v1 {
      return {
        A_AhkPath: '',
        A_AppData: '',
        A_AppDataCommon: '',
        A_ComputerName: '',
        A_ComSpec: '',
        A_Desktop: '',
        A_DesktopCommon: '',
        A_IsCompiled: '',
        A_IsUnicode: '',
        A_LineFile: '',
        A_MyDocuments: '',
        A_ProgramFiles: '',
        A_Programs: '',
        A_ProgramsCommon: '',
        A_ScriptDir: '',
        A_ScriptFullPath: '',
        A_ScriptName: '',
        A_Space: '',
        A_StartMenu: '',
        A_StartMenuCommon: '',
        A_Startup: '',
        A_StartupCommon: '',
        A_Tab: '',
        A_Temp: '',
        A_UserName: '',
        A_WinDir: '',
        ...env,
      };
    }
    function createAutoHotkeyEnvironments_v2(env: PartialedAutoHotkeyEnvironments_v2): AutoHotkeyEnvironments_v2 {
      return {
        A_AhkPath: '',
        A_AppData: '',
        A_AppDataCommon: '',
        A_ComputerName: '',
        A_ComSpec: '',
        A_Desktop: '',
        A_DesktopCommon: '',
        A_IsCompiled: '',
        A_LineFile: '',
        A_MyDocuments: '',
        A_ProgramFiles: '',
        A_Programs: '',
        A_ProgramsCommon: '',
        A_ScriptDir: '',
        A_ScriptFullPath: '',
        A_ScriptName: '',
        A_Space: '',
        A_StartMenu: '',
        A_StartMenuCommon: '',
        A_Startup: '',
        A_StartupCommon: '',
        A_Tab: '',
        A_Temp: '',
        A_UserName: '',
        A_WinDir: '',
        ...env,
      };
    }
  }
  function expandVariable(rawPath: string): string {
    let expandedPath = rawPath;
    for (const [ key, value ] of Object.entries(env)) {
      const regexp = new RegExp(`%${key}%`, 'giu');
      expandedPath = expandedPath.replace(regexp, value);
    }
    return expandedPath;
  }
  function toFullPath(filePath: string, cwd: string | undefined): string {
    if (path.isAbsolute(filePath)) {
      return path.resolve(filePath);
    }

    if (!cwd) {
      throw Error('The current directory is not set. You must use the `setCurrentDirectory` method or set A_LineFile or A_ScriptDir.');
    }
    return path.resolve(cwd, filePath);
  }
};
