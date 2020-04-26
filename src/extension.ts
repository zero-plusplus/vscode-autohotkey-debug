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
import { AhkDebugSession } from './dap/ahkDebug';

class AhkConfigurationProvider implements DebugConfigurationProvider {
  public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
    const isEmptyLaunchConfig = !config.type && !config.request && !config.name;
    if (isEmptyLaunchConfig) {
      const editor = window.activeTextEditor;
      if (editor !== undefined) {
        config.type = 'ahk';
        config.name = 'Launch';
        config.request = 'launch';
        config.program = '${file}';
        config.runtime = editor.document.languageId.toLowerCase() === 'ahk'
          ? path.resolve(`${String(process.env.ProgramFiles)}/AutoHotkey/AutoHotkey.exe`)
          : config.runtime = path.resolve(`${String(process.env.ProgramFiles)}/AutoHotkey/v2/AutoHotkey.exe`); // ahk2 or ah2
      }
    }

    if (!config.program) {
      return window.showInformationMessage('Cannot find a program to debug').then((_) => undefined);
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
