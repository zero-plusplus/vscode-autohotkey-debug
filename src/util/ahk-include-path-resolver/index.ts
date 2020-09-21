import { accessSync, readFileSync, statSync } from 'fs';
import * as path from 'path';
import { readDirDeepSync } from 'read-dir-deep';
import insensitiveUniq from './util/insensitiveUniq';

/**
 * Library folder type.
 * @see https://www.autohotkey.com/docs/Functions.htm#lib
 * @see https://lexikos.github.io/v2/docs/Functions.htm#lib
 */
export type LibraryType = 'local' | 'user' | 'standard';
/**
 * Additional information to resolve the path.
 * @export
 * @interface AdditionalInfo
 * @param ver
 */
export interface AdditionalInfo {
  /**
   * Absolute path of runtime. For example `C:\Program Files\AutoHotkey\AutoHotkey.exe`
   */
  readonly runtimePath: string;
  /**
   * version of AutoHotkey.
   */
  readonly version: 1 | 2;
  /**
   * File path passed to the runtime.
   */
  readonly rootPath: string;
  /**
   * The path set in this property is used to resolve the `A_LineFile`.It is needed when processing nested `#Include`.
   */
  readonly currentPath?: string;
  /**
   * Type of library folder used to resolve paths.
   *
   * @see https://www.autohotkey.com/docs/Functions.htm#lib
   */
  readonly libraryType?: LibraryType;
  /**
   * For example, if you change the `My documents` folder, this program will not be able to detect it. You can overwrite the value of the variable in such cases.
   */
  readonly overwrite?: SupportVariables;
}
export interface ParsedInclude {
  readonly isOptional: boolean;
  readonly isAgainMode: boolean;
  readonly path: string;
}
/**
 * List of built-in variables supported.
 * @see https://www.autohotkey.com/docs/commands/_Include.htm
 * @see https://lexikos.github.io/v2/docs/commands/_Include.htm
 */
interface SupportVariables {
  /**
   * For non-compiled scripts: The full path and name of the EXE file that is actually running the current script. For example: `C:\Program Files\AutoHotkey\AutoHotkey.exe`
   *
   * For compiled scripts: The same as the above except the AutoHotkey directory is discovered via the registry entry HKLM\SOFTWARE\AutoHotkey\InstallDir. If there is no such entry, A_AhkPath is blank.
   */
  readonly A_AhkPath: string;
  /**
   * The full path and name of the folder containing the current user's application-specific data. For example: `C:\Users\<UserName>\AppData\Roaming`
   */
  readonly A_AppData: string;
  /**
   * The full path and name of the folder containing the all-users application-specific data. For example: `C:\ProgramData`
   */
  readonly A_AppDataCommon: string;
  /**
   * The name of the computer as seen on the network.
   */
  readonly A_ComputerName: string;
  /**
   * Contains the same string as the environment's ComSpec variable. Often used with Run/RunWait. For example: `C:\Windows\system32\cmd.exe`
   */
  readonly A_ComSpec: string;
  /**
   * The full path and name of the folder containing the current user's desktop files. For example: `C:\Users\<UserName>\Desktop`
   */
  readonly A_Desktop: string;
  /**
   * The full path and name of the folder containing the all-users desktop files. For example: `C:\Users\Public\Desktop`
   */
  readonly A_DesktopCommon: string;
  // A_IsCompiled // not support
  /**
   * Set automatically by AdditionalInfo. Normally you do not need to overwrite this variable.
   *
   * The full path and name of the file to which A_LineNumber belongs, which will be the same as A_ScriptFullPath unless the line belongs to one of a non-compiled script's #Include files.
   */
  readonly A_LineFile: string;
  /**
   * The full path and name of the current user's "My Documents" folder. Unlike most of the similar variables, if the folder is the root of a drive, the final backslash is not included (e.g. it would contain M: rather than M:\). For example: `C:\Users\<UserName>\Documents`
   */
  readonly A_MyDocuments: string;
  /**
   * The Program Files directory (e.g. `C:\Program Files or C:\Program Files (x86)`). This is usually the same as the ProgramFiles environment variable.
   *
   * On 64-bit systems (and not 32-bit systems), the following applies:
   * If the executable (EXE) that is running the script is 32-bit, A_ProgramFiles returns the path of the `Program Files (x86)` directory.
   * For 32-bit processes, the ProgramW6432 environment variable contains the path of the 64-bit Program Files directory. On Windows 7 and later, it is also set for 64-bit processes.
   * The ProgramFiles(x86) environment variable contains the path of the 32-bit Program Files directory.
   * [v1.0.43.08+]: The A_ prefix may be omitted, which helps ease the transition to #NoEnv.
   */
  readonly A_ProgramFiles: string;
  /**
   * The full path and name of the Programs folder in the current user's Start Menu. For example: `C:\Users\<UserName>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs`
   */
  readonly A_Programs: string;
  /**
   * The full path and name of the Programs folder in the all-users Start Menu. For example: `C:\ProgramData\Microsoft\Windows\Start Menu\Programs`
   */
  readonly A_ProgramsCommon: string;
  /**
   * Set automatically by AdditionalInfo. Normally you do not need to overwrite this variable.
   *
   * The full path of the directory where the current script is located. The final backslash is omitted (even for root directories).
   */
  readonly A_ScriptDir: string;
  /**
   * Set automatically by AdditionalInfo. Normally you do not need to overwrite this variable.
   *
   * The full path of the current script, e.g. `C:\My Documents\My Script.ahk`
   */
  readonly A_ScriptFullPath: string;
  /**
   * Set automatically by AdditionalInfo. Normally you do not need to overwrite this variable.
   *
   * The file name of the current script, without its path, e.g. `MyScript.ahk`
   */
  readonly A_ScriptName: string;
  /**
   * This variable contains a single space character.
   */
  readonly A_Space: ' ';
  /**
   * The full path and name of the current user's Start Menu folder. For example: `C:\Users\<UserName>\AppData\Roaming\Microsoft\Windows\Start Menu`
   */
  readonly A_StartMenu: string;
  /**
   * The full path and name of the all-users Start Menu folder. For example: `C:\ProgramData\Microsoft\Windows\Start Menu`
   */
  readonly A_StartMenuCommon: string;
  /**
   * The full path and name of the Startup folder in the current user's Start Menu. For example: `C:\Users\<UserName>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`
   */
  readonly A_Startup: string;
  /**
   * The full path and name of the Startup folder in the all-users Start Menu. For example: `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup`
   */
  readonly A_StartupCommon: string;
  /**
   * This variable contains a single tab character.
   */
  // eslint-disable-next-line no-tabs
  readonly A_Tab: '	';
  /**
   * The full path and name of the folder designated to hold temporary files. It is retrieved from one of the following locations (in order): 1) the environment variables TMP, TEMP, or USERPROFILE; 2) the Windows directory. For example: `C:\Users\<UserName>\AppData\Local\Temp`
   */
  readonly A_Temp: string;
  /**
   * The logon name of the user who launched this script.
   */
  readonly A_UserName: string;
  /**
   * The Windows directory. For example: `C:\Windows`
   */
  readonly A_WinDir: string;
  /**
   * Set automatically by AdditionalInfo. Normally you do not need to overwrite this variable.
   *
   * The full path of the directory where the current script is located. The final backslash is omitted (even for root directories).
   */
  readonly A_WorkingDir: string;
}

const defaultConversionTable: SupportVariables = {
  A_AhkPath: `${String(process.env.ProgramFiles)}\\AutoHotkey\\AutoHotkey.exe`,
  A_AppData: String(process.env.APPDATA),
  A_AppDataCommon: String(process.env.ProgramData),
  A_ComputerName: String(process.env.COMPUTERNAME),
  A_ComSpec: String(process.env.ComSpec),
  A_Desktop: `${String(process.env.USERPROFILE)}\\Desktop`,
  A_DesktopCommon: `${String(process.env.PUBLIC)}\\Desktop`,
  A_LineFile: '',
  A_MyDocuments: `${String(process.env.USERPROFILE)}\\Documents`,
  A_ProgramFiles: String(process.env.ProgramFiles),
  A_Programs: `${String(process.env.APPDATA)}\\Microsoft\\Windows\\Start Menu\\Programs`,
  A_ProgramsCommon: `${String(process.env.ALLUSERSPROFILE)}\\Microsoft\\Windows\\Start Menu\\Programs`,
  A_ScriptDir: '',
  A_ScriptFullPath: '',
  A_ScriptName: '',
  A_Space: ' ',
  A_StartMenu: `${String(process.env.APPDATA)}\\Microsoft\\Windows\\Start Menu`,
  A_StartMenuCommon: `${String(process.env.ALLUSERSPROFILE)}\\Microsoft\\Windows\\Start Menu`,
  A_Startup: `${String(process.env.APPDATA)}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup`,
  A_StartupCommon: `${String(process.env.ALLUSERSPROFILE)}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup`,
  // eslint-disable-next-line no-tabs
  A_Tab: '	',
  A_Temp: String(process.env.TEMP),
  A_UserName: String(process.env.USERNAME),
  A_WinDir: String(process.env.SystemRoot),
  A_WorkingDir: '',
};

const defaultConfig = { rootPath: '', libraryType: 'local' };
export default class Resolver {
  private static readonly includeRegex = /^\s*#Include(?:|(?<mode>Again))\s+(?:|(?<optional>[*]i)\s+)(?:(?<includePath>[^*\s\r\n<>]+)|<(?<libraryPath>[^*\s\r\n<>]+)>)/iu;
  public readonly conversionTable: SupportVariables;
  public readonly config: AdditionalInfo;
  constructor(config: AdditionalInfo) {
    const { runtimePath, overwrite, currentPath } = config;
    const rootPath = path.resolve(config.rootPath);

    this.conversionTable = {
      ...defaultConversionTable,
      ...{
        A_AhkPath: runtimePath,
        A_LineFile: currentPath ?? rootPath,
        A_ScriptDir: path.dirname(rootPath),
        A_ScriptFullPath: rootPath,
        A_ScriptName: path.basename(rootPath),
        A_WorkingDir: path.dirname(rootPath),
      },
      ...overwrite,
    };

    this.config = {
      ...defaultConfig,
      ...config,
    } as AdditionalInfo;
  }
  public getLibraryPathList(libraryType: LibraryType): string[] {
    const libraryDirPath = this.getLibraryDir(libraryType);
    try {
      accessSync(libraryDirPath);

      return readDirDeepSync(libraryDirPath)
        .map((filePath) => path.resolve(filePath))
        .filter((filePath) => path.extname(filePath) === '.ahk');
    }
    catch (error) {
    }

    return [];
  }
  /**
   * Get the library folder.
   *
   * See below.
   * * [v1](https://www.autohotkey.com/docs/Functions.htm#lib)
   * * [v2](https://lexikos.github.io/v2/docs/Functions.htm#lib)
   * @param libraryType 'local' | 'user' | 'standard'
   */
  public getLibraryDir(libraryType: LibraryType): string {
    let dirPath = '';

    if (libraryType === 'local') {
      dirPath = `${String(this.conversionTable.A_ScriptDir)}/lib`;
    }
    else if (libraryType === 'user') {
      dirPath = `${String(this.conversionTable.A_MyDocuments)}/AutoHotkey/lib`;
    }
    else {
      dirPath = `${String(this.conversionTable.A_AhkPath)}/../AutoHotkey/lib/`;
    }

    return path.resolve(dirPath);
  }
  /**
   *
   * @param variableName Built-in variable name. You can see the variables supported by {#link SupportVariables}.
   */
  public dereference(variableName: string): string | null {
    if (variableName in this.conversionTable) {
      return String(this.conversionTable[variableName]);
    }
    return null;
  }
  /**
   * Resolve so that the path that can be specified by `#Include` can be handled in JavaScript.
   * @param includePath For example: '%A_LineFile%\..\otherscript.ahk'
   */
  public resolve(includePath: string, currentDir?: string): string | null {
    let resolvedPath = includePath;

    Array.from(resolvedPath.matchAll(/(?:%(?<variableName>[\w_]+)%)/gui)).forEach((match) => {
      const variableName = match.groups!.variableName;
      const dereferencedValue = this.dereference(variableName);
      if (dereferencedValue) {
        resolvedPath = resolvedPath.replace(new RegExp(`(%${variableName}%)`, 'uig'), dereferencedValue);
      }
    });

    if (path.isAbsolute(resolvedPath)) {
      return path.resolve(resolvedPath);
    }

    let _currentDir: string;
    if (this.config.version === 2) {
      _currentDir = currentDir ?? this.conversionTable.A_LineFile;
    }
    else {
      _currentDir = currentDir ?? this.conversionTable.A_ScriptDir;
    }

    if (resolvedPath.startsWith('..')) {
      return path.resolve(`${_currentDir}/${resolvedPath}`); // ..\relativePath -> currentDir\..\relativePath
    }
    else if (resolvedPath.startsWith('.')) {
      return path.resolve(resolvedPath.replace('.', _currentDir)); // .\relativePath -> currentDir\relativePath
    }
    return path.resolve(`${_currentDir}/${resolvedPath}`); // relativePath -> currentDir\relativePath
  }
  /**
   * Extract the path from the compilable "#Include" line and resolve.
   * @param includeLine The path where the AutoHotkey built-in variables are embedded. For example: `%A_LineFile%\..\OtherScrpit.ahk`
   */
  public resolveByIncludeLine(includeLine: string, currentDir?: string): string | null {
    const parsedInclude = this.parseInclude(includeLine);
    if (!parsedInclude) {
      return null;
    }
    return this.resolve(parsedInclude.path, currentDir);
  }
  public parseInclude(includeLine: string): ParsedInclude | null {
    const match = Resolver.includeRegex.exec(includeLine);
    if (!match?.groups) {
      return null;
    }
    const isAgainMode = Boolean(match.groups.mode);
    const isOptionMode = Boolean(match.groups.optional);
    const includePath = match.groups.includePath;
    const libraryPath = match.groups.libraryPath;

    let filePath = includePath || libraryPath;
    if (libraryPath) {
      filePath = `${this.getLibraryDir(this.config.libraryType!)}/${String(filePath)}.ahk`;
    }
    const parsedInclude = {
      isAgainMode,
      isOptional: isOptionMode,
      path: filePath,
    } as ParsedInclude;
    return parsedInclude;
  }
  public extractAllIncludePath(libraryTypes: LibraryType[], recursiveInfo: { filePath?: string; libraryPathList: string[]; currentDir?: string } = { libraryPathList: [] }): string[] {
    const includePathList: string[] = [];

    if (!recursiveInfo.currentDir) {
      libraryTypes.forEach((libraryType) => {
        recursiveInfo.libraryPathList.push(...this.getLibraryPathList(libraryType));
      });
    }

    const targetPath = path.resolve(recursiveInfo.filePath ?? this.config.rootPath);
    try {
      accessSync(targetPath);

      const sourceCode = readFileSync(targetPath, 'utf8');
      const includeRegex = new RegExp(Resolver.includeRegex.source, 'guim');

      for (const match of sourceCode.matchAll(includeRegex)) {
        const includeLine = match[0];
        const fileOrDirPath = this.resolveByIncludeLine(includeLine, recursiveInfo.currentDir);
        if (!fileOrDirPath) {
          throw Error('File not found.');
        }

        const stats = statSync(fileOrDirPath);
        if (stats.isDirectory()) {
          recursiveInfo.currentDir = fileOrDirPath;
          continue;
        }
        else {
          const filePath = fileOrDirPath;
          recursiveInfo.filePath = filePath;
          includePathList.push(filePath);

          const resolve = new Resolver({
            ...this.config,
            currentPath: filePath,
          });

          includePathList.push(...resolve.extractAllIncludePath(libraryTypes, recursiveInfo));
        }
      }

      recursiveInfo.libraryPathList.forEach((libraryPath) => {
        const basename = path.basename(libraryPath);
        const funcName = basename.slice(0, basename.lastIndexOf('.'));
        const regex = new RegExp(`${funcName}(?:|_[^\\(\\)]+)\\(.*\\)`, 'ui');
        if (regex.test(sourceCode)) {
          includePathList.push(libraryPath);
        }
      });
    }
    catch (error) {
    }


    return insensitiveUniq(includePathList);
  }
}
