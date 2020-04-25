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
    // if launch.json is missing or empty
    if (!config.type && !config.request && !config.name) {
      const editor = window.activeTextEditor;
      if (editor) {
        if (editor.document.languageId === 'ahk'
          || editor.document.languageId === 'ahk2'
          || editor.document.languageId === 'ah') {
          config.type = 'ahk';
          config.name = 'Launch';
          config.request = 'launch';
          config.program = '${file}';
          config.stopOnEntry = true;
        }
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
