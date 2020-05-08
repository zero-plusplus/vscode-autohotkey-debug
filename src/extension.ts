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
import { AhkDebugSession, LaunchRequestArguments } from './dap/ahkDebug';

class AhkConfigurationProvider implements DebugConfigurationProvider {
  public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
    const editor = window.activeTextEditor;
    const defaultConfig = {
      type: 'ahk',
      name: 'Launch',
      request: 'launch',
      program: '${file}',
      hostname: 'localhost',
      port: 9000,
      // If a value greater than 10001 is specified, malfunction may occur due to specification changes.
      // Ref: https://github.com/Lexikos/AutoHotkey_L/blob/36600809a348bd3a09d59e335d2897ed16f11ac7/source/Debugger.cpp#L960
      // > TODO: Include the lazy-var arrays for completeness. Low priority since lazy-var arrays are used only for 10001+ variables, and most conventional debugger interfaces would generally not be useful with that many variables.
      maxChildren: 10000, // 10001以上の
      runtime: editor && editor.document.languageId.toLowerCase() === 'ahk'
        ? path.resolve(`${String(process.env.ProgramFiles)}/AutoHotkey/AutoHotkey.exe`)
        : config.runtime = path.resolve(`${String(process.env.ProgramFiles)}/AutoHotkey/v2/AutoHotkey.exe`), // ahk2 or ah2
    } as LaunchRequestArguments;
    defaults(config, defaultConfig);

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
