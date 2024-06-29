/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import * as path from 'path';
import * as vscode from 'vscode';
import JSONC from 'jsonc-parser';
import { DebugConfig } from '../../types/dap/config.types';
import { createDefaultDebugConfig } from '../config/default';
import { readFileSync } from 'fs';
import { deepDefaults } from '../../tools/utils';
import * as attributes from '../config/attributes';
import { createAttributesValidator } from '../config/validator';

export const validateDebugConfig = createAttributesValidator([
  attributes.name.validator,
  attributes.type.validator,
  attributes.request.validator,
  attributes.stopOnEntry.validator,
  attributes.args.validator,
  attributes.port.validator,
  attributes.hostname.validator,
  attributes.skipFunctions.validator,
  attributes.skipFiles.validator,
  attributes.skipFiles.validator,
  attributes.trace.validator,
  attributes.noDebug.validator,
  attributes.cwd.validator,
  attributes.env.validator,
  attributes.openFileOnExit.validator,
  attributes.variableCategories.validator,
  attributes.setBreakpoints.validator,
  attributes.usePerfTips.validator,
  attributes.useIntelliSenseInDebugging.validator,
  attributes.useDebugDirective.validator,
  attributes.useOutputDebug.validator,
  attributes.useAutoJumpToError.validator,
  attributes.useAnnounce.validator,
  attributes.useLoadedScripts.validator,
  attributes.useUIAVersion.validator,

  attributes.program.validator,
  attributes.runtime.validator,
  attributes.runtimeArgs.validator,
], {
  async getCurrentFile() {
    return Promise.resolve(vscode.window.activeTextEditor?.document.fileName);
  },
  async getLanguageId(programPath) {
    const doc = await vscode.workspace.openTextDocument(programPath);
    return doc.languageId;
  },
  async warning(message) {
    await vscode.window.showWarningMessage(message);
  },
});


const debugConfigurationProvider: vscode.DebugConfigurationProvider = {
  resolveDebugConfiguration(folder, config, token): vscode.ProviderResult<vscode.DebugConfiguration> {
    let defaultedConfig = deepDefaults(config, createDefaultDebugConfig('${file}')) as vscode.DebugConfiguration;
    if (config.extends) {
      const launch: any = folder
        ? JSONC.parse(readFileSync(path.resolve(folder.uri.fsPath, '.vscode', 'launch.json'), 'utf-8'))
        : vscode.workspace.getConfiguration().get<Record<string, any>>('launch');

      if (launch && 'configurations' in launch && Array.isArray(launch.configurations)) {
        const sourceConfig = launch.configurations.find((attribute) => String(attribute.name).toLowerCase(), String(config.extends).toLowerCase());
        if (!sourceConfig) {
          throw Error(`No matching configuration found. Please modify the \`extends\` attribute. \nSpecified: ${String(config.extends)}`);
        }
        defaultedConfig = deepDefaults(sourceConfig, defaultedConfig);
      }
    }


    if (defaultedConfig.openFileOnExit === '${file}' && !vscode.window.activeTextEditor) {
      defaultedConfig.openFileOnExit = undefined;
    }
    return defaultedConfig;
  },
  async resolveDebugConfigurationWithSubstitutedVariables(folder, config, token): Promise<vscode.DebugConfiguration | null | undefined> {
    const vardatedConfig = await validateDebugConfig(config as DebugConfig) as vscode.DebugConfiguration;
    return vardatedConfig;
  },
};

export const debugConfigSubscribers = [
  vscode.debug.registerDebugConfigurationProvider('autohotkey', debugConfigurationProvider),

  // Allow users to start debugging with a warning in case they misinterpret type as an AutoHotkey extension
  vscode.debug.registerDebugConfigurationProvider('ahk', debugConfigurationProvider),
  vscode.debug.registerDebugConfigurationProvider('ahk2', debugConfigurationProvider),
  vscode.debug.registerDebugConfigurationProvider('ahkh', debugConfigurationProvider),
  vscode.debug.registerDebugConfigurationProvider('ahkh2', debugConfigurationProvider),
];
