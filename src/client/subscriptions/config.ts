/* eslint-disable no-param-reassign, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import * as path from 'path';
import * as vscode from 'vscode';
import JSONC from 'jsonc-parser';
import { validateDebugConfig } from '../config/validator';
import { DebugConfig } from '../../types/dap/config.types';
import { createDefaultDebugConfig } from '../config/default';
import { readFileSync } from 'fs';
import { deepDefaults } from '../../tools/utils';

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
    return await validateDebugConfig(config as DebugConfig) as vscode.DebugConfiguration;
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
