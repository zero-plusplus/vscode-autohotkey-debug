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
import { AhkDebugSession } from './dap/ahkDebug';

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
      runtime: editor && editor.document.languageId.toLowerCase() === 'ahk'
        ? path.resolve(`${String(process.env.ProgramFiles)}/AutoHotkey/AutoHotkey.exe`)
        : config.runtime = path.resolve(`${String(process.env.ProgramFiles)}/AutoHotkey/v2/AutoHotkey.exe`), // ahk2 or ah2
    };
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
