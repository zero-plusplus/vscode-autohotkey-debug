import * as path from 'path';
import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { DebugConfig } from '../../../types/dap/config.types';
import { defaultAutoHotkeyInstallDir, getLaunchInfoByLauncher } from '../../../tools/autohotkey';
import { whereCommand } from '../../../tools/utils/whereCommand';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'runtime';
export const defaultValue: DebugConfig['runtime'] = path.resolve(defaultAutoHotkeyInstallDir, 'v2', 'AutoHotkey.exe');
export const attributeRule: AttributeRule<DebugConfig['runtime']> = validators.path();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['runtime'], DebugConfig> = {
  async undefined(value, schema, onError, optionals) {
    const installDir = typeof optionals?.installDir === 'string' ? optionals.installDir : defaultAutoHotkeyInstallDir;
    const defaultRuntime_v1 = path.resolve(installDir, 'AutoHotkey.exe');
    const defaultRuntime_v2 = path.resolve(installDir, 'v2', 'AutoHotkey.exe');

    const languageId = schema.getRawAttribute<DebugConfig['__languageId']>('__languageId');
    const runtime_v1 = schema.getRawAttribute<string>('runtime_v1');
    const runtime_v2 = schema.getRawAttribute<string>('runtime_v2');

    // Case 1: If a runtime is set for each version, assign by language ID. If the language ID cannot be retrieved, the v2 runtime is always allocated in priority
    if (runtime_v1 && runtime_v2) {
      if (languageId === 'ahk' || languageId === 'ahkh') {
        return this.string!(runtime_v1, schema, onError, { installDir });
      }
      return this.string!(runtime_v2, schema, onError, { installDir });
    }
    else if (runtime_v1) {
      return this.string!(runtime_v1, schema, onError, { installDir });
    }
    else if (runtime_v2) {
      return this.string!(runtime_v2, schema, onError, { installDir });
    }

    const program = schema.getRawAttribute<string>('program');
    if (program) {
      const extname = path.extname(program);
      const dirname = path.dirname(program);
      const filenameNoext = path.basename(program, extname);
      const defaultRuntime = path.resolve(dirname, `${filenameNoext}.exe`);

      // Case 2: [Default file name](https://www.autohotkey.com/docs/v2/Scripts.htm#defaultfile)
      // If `program` can be treated as a default file name, assign its runtime path
      if (predicate.fileExists(defaultRuntime)) {
        return defaultRuntime;
      }

      // Case 3-1: If AutoHotkey Launcher exists, select the runtime from its information
      const info = getLaunchInfoByLauncher(program, installDir);
      if (info?.runtime) {
        return info.runtime;
      }
      // Case 3-2: The info.requires version can be obtained, but for some reason the runtime may be an empty character. In that case, set the default value
      if (info?.requires) {
        const runtime = info.requires === '2'
          ? defaultRuntime_v2
          : defaultRuntime_v1;
        return runtime;
      }
    }

    // Case 4: Default value
    return languageId === 'ahk' || languageId === 'ahkh'
      ? defaultRuntime_v1
      : defaultRuntime_v2;
  },
  async string(value, schema, onError, optionals) {
    // Case 1: If the value is an existing directory, it is treated as the AutoHotkey installation directory
    if (predicate.directoryExists(value)) {
      return this.undefined!(undefined, schema, onError, { installDir: value });
    }
    // Case 2: An absolute path does not require normalisation
    if (path.isAbsolute(value)) {
      return value;
    }

    const installDir = typeof optionals?.installDir === 'string' ? optionals.installDir : defaultAutoHotkeyInstallDir;

    // Case 3: [Windows command](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands)
    // Convert Windows command name to full path
    if (predicate.isValidWindowsFileName(value) && [ undefined, 'exe' ].includes(path.extname(value))) {
      const commandFullPath = whereCommand(value);
      if (commandFullPath) {
        return commandFullPath;
      }
      // If not treated as a command name, go to the next case
    }

    // Case 4: Implicit relative path
    return path.resolve(installDir, value);
  },
};
