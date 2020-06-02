import * as path from 'path';
import {
  CancellationToken,
  DebugAdapterDescriptor,
  DebugAdapterDescriptorFactory,
  DebugAdapterInlineImplementation,
  DebugConfiguration,
  DebugConfigurationProvider,
  DebugSession,
  ExtensionContext,
  ProviderResult,
  WorkspaceFolder,
  debug,
  window,
} from 'vscode';
import { defaults } from 'underscore';
import { AhkDebugSession } from './ahkDebug';

class AhkConfigurationProvider implements DebugConfigurationProvider {
  public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
    const defaultConfig = {
      type: 'ahk',
      name: 'Launch',
      request: 'launch',
      program: '${file}',
      args: [],
      env: {},
      hostname: 'localhost',
      port: 9000,
      // If a value greater than 10000 is specified, malfunction may occur due to specification changes.
      // Ref: https://github.com/Lexikos/AutoHotkey_L/blob/36600809a348bd3a09d59e335d2897ed16f11ac7/source/Debugger.cpp#L960
      // > TODO: Include the lazy-var arrays for completeness. Low priority since lazy-var arrays are used only for 10001+ variables, and most conventional debugger interfaces would generally not be useful with that many variables.
      maxChildren: 10000,
      runtime_v1: 'AutoHotkey.exe',
      runtime_v2: 'v2/AutoHotkey.exe',
      useAdvancedBreakpoint: false,
      openFileOnExit: null,
    };
    defaults(config, defaultConfig);

    for (const key in config.env) {
      if (config.env[key] === null) {
        config.env[key] = '';
      }
    }

    return config;
  }
  public resolveDebugConfigurationWithSubstitutedVariables(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
    if (typeof config.runtime === 'undefined') {
      const editor = window.activeTextEditor;
      config.runtime = editor && editor.document.languageId.toLowerCase() === 'ahk'
        ? config.runtime_v1
        : config.runtime_v2; // ahk2 or ah2
    }

    if (config.runtime !== '') {
      if (!path.isAbsolute(config.runtime)) {
        const ahkPath = `${String(process.env.PROGRAMFILES)}/AutoHotkey`;
        config.runtime = path.resolve(ahkPath, config.runtime);
      }

      if (path.extname(config.runtime) === '') {
        config.runtime += '.exe';
      }
    }
    return config;
  }
}
class InlineDebugAdapterFactory implements DebugAdapterDescriptorFactory {
  public createDebugAdapterDescriptor(_session: DebugSession): ProviderResult<DebugAdapterDescriptor> {
    return new DebugAdapterInlineImplementation(new AhkDebugSession());
  }
}

export const activate = function(context: ExtensionContext): void {
  const provider = new AhkConfigurationProvider();
  context.subscriptions.push(debug.registerDebugConfigurationProvider('ahk', provider));

  context.subscriptions.push(debug.registerDebugAdapterDescriptorFactory('ahk', new InlineDebugAdapterFactory()));
};
