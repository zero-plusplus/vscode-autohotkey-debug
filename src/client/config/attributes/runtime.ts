import * as path from 'path';
import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig } from '../../../types/dap/config.types';
import { defaultAutoHotkeyInstallDir, defaultAutoHotkeyRuntimeDir_v2, defaultAutoHotkeyRuntimePath_v1, defaultAutoHotkeyRuntimePath_v2, defaultAutoHotkeyUxRuntimePath, getLaunchInfoByLauncher } from '../../../tools/autohotkey';
import { whereCommand } from '../../../tools/utils/whereCommand';

export const attributeName = 'runtime';
export const defaultValue: DebugConfig['runtime'] = undefined;
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    predicate.fileExists,
    checker.throwFileNotFoundError,
    [
      validators.expectUndefined(normalizeByUndefined),
      validators.expectString(async(value: string) => {
        // Case 1: If the value is an existing directory, it is treated as the AutoHotkey installation directory
        if (predicate.directoryExists(value)) {
          const installDir = value;
          return normalizeByUndefined(undefined, installDir);
        }

        // Case 2: An absolute path does not require normalisation
        if (path.isAbsolute(value)) {
          return value;
        }

        // Case 3: Explicit relative path
        if (value.startsWith('./')) {
          return resolveAutoHotkeyRuntimePath(value);
        }

        // Case 4: [Windows command](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands)
        // Convert Windows command name to full path
        if (predicate.isValidWindowsFileName(value) && [ undefined, 'exe' ].includes(path.extname(value))) {
          const commandFullPath = whereCommand(value);
          if (commandFullPath) {
            return commandFullPath;
          }
          // If not treated as a command name, the following cases are handled
        }

        // Case 5: Implicit relative path
        return resolveAutoHotkeyRuntimePath(value);
      }),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);

  // #region helpers
  function resolveAutoHotkeyRuntimePath(filePath: string, installDir = defaultAutoHotkeyInstallDir): string {
    return path.isAbsolute(filePath) ? filePath : path.resolve(installDir, filePath);
  }
  async function normalizeByUndefined(value: undefined, installDir = defaultAutoHotkeyInstallDir): Promise<string> {
    const program = checker.getDependency('program');
    const runtime_v2 = checker.getByName('runtime_v2');
    const runtime_v1 = checker.getByName('runtime_v1');

    // Case 1: If a runtime is set for each version, assign by language ID. If the language ID cannot be retrieved, the v2 runtime is always allocated in priority
    if (runtime_v2 && runtime_v1) {
      if (checker.utils.getLanguageId) {
        const languageId = await checker.utils.getLanguageId(program);
        if (languageId === 'ahk' || languageId === 'ahkh') {
          return resolveAutoHotkeyRuntimePath(runtime_v1, installDir);
        }
      }
      return resolveAutoHotkeyRuntimePath(runtime_v2, installDir);
    }
    else if (runtime_v2) {
      return resolveAutoHotkeyRuntimePath(runtime_v2, installDir);
    }
    else if (runtime_v1) {
      return resolveAutoHotkeyRuntimePath(runtime_v1, installDir);
    }

    const extname = path.extname(program);
    const dirname = path.dirname(program);
    const filenameNoext = path.basename(program, extname);
    const defaultRuntime = path.resolve(dirname, filenameNoext, 'exe');

    // Case 2: [Default file name](https://www.autohotkey.com/docs/v2/Scripts.htm#defaultfile)
    // If `program` can be treated as a default file name, assign its runtime path
    if (predicate.fileExists(defaultRuntime)) {
      return defaultRuntime;
    }

    // Case 3: If AutoHotkey Launcher exists, select the runtime from its information
    if (predicate.fileExists(defaultAutoHotkeyUxRuntimePath)) {
      const info = getLaunchInfoByLauncher(program);
      if (info) {
        if (predicate.fileExists(info.runtime)) {
          return info.runtime;
        }

        // The info.requires version can be obtained, but for some reason the runtime may be an empty character. In that case, set the default value
        if (info.runtime === '' && info.requires) {
          const runtime = info.requires === '2' ? defaultAutoHotkeyRuntimePath_v2 : defaultAutoHotkeyRuntimePath_v1;
          return runtime;
        }
      }
    }

    // Case 4: Default value
    if (predicate.directoryExists(defaultAutoHotkeyRuntimeDir_v2)) {
      return defaultAutoHotkeyRuntimeDir_v2;
    }
    return defaultAutoHotkeyInstallDir;
  }
  // #endregion helpers
};
