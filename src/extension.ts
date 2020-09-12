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
  languages,
  window,
} from 'vscode';
import { defaults, range } from 'underscore';
import { completionItemProvider } from './CompletionItemProvider';
import { AhkDebugSession } from './ahkDebug';

class AhkConfigurationProvider implements DebugConfigurationProvider {
  public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
    const defaultConfig = {
      type: 'autohotkey',
      name: 'Launch',
      request: 'launch',
      program: '${file}',
      args: [],
      env: {},
      hostname: 'localhost',
      port: 9000,
      permittedPortRange: [],
      // If a value greater than 10000 is specified, malfunction may occur due to specification changes.
      // Ref: https://github.com/Lexikos/AutoHotkey_L/blob/36600809a348bd3a09d59e335d2897ed16f11ac7/source/Debugger.cpp#L960
      // > TODO: Include the lazy-var arrays for completeness. Low priority since lazy-var arrays are used only for 10001+ variables, and most conventional debugger interfaces would generally not be useful with that many variables.
      maxChildren: 10000,
      runtime_v1: 'AutoHotkey.exe',
      runtime_v2: 'v2/AutoHotkey.exe',
      runtimeArgs_v1: [ '/ErrorStdOut' ],
      runtimeArgs_v2: [ '/ErrorStdOut' ],
      useProcessUsageData: false,
      usePerfTips: false,
      useDebugDirective: false,
      openFileOnExit: null,
    };
    defaults(config, defaultConfig);

    if (config.usePerfTips) {
      const defaultFormat = config.useProcessUsageData
        ? `{{elapsedTime_s}}s elapsed. AHK used {{usageCpu}}% CPU and {{usageMemory_MB}}MB memory`
        : '{{elapsedTime_s}}s elapsed';
      const defaultUsePerfTips = {
        fontColor: 'gray',
        fontStyle: 'italic',
        format: defaultFormat,
      };

      if (config.usePerfTips === true) {
        config.usePerfTips = defaultUsePerfTips;
      }
      else {
        if (typeof config.usePerfTips === 'string') {
          config.usePerfTips = { format: config.usePerfTips };
        }
        defaults(config.usePerfTips, defaultUsePerfTips);
      }
    }

    if (config.useDebugDirective) {
      const defaultDirectiveComment = {
        useBreakpointDirective: false,
        useOutputDirective: false,
      };
      if (config.useDebugDirective === true) {
        config.useDebugDirective = {
          useBreakpointDirective: false,
          useOutputDirective: true,
        };
      }
      else {
        defaults(config.useDebugDirective, defaultDirectiveComment);
      }

      if (config.useDebugDirective.useOutputDirective) {
        const levels = [ 'FATAL', 'ERROR', 'WARN', 'INFO' ];
        if (config.useDebugDirective.useOutputDirective === true) {
          config.useDebugDirective.useOutputDirective = levels;
        }
        else if (typeof config.useDebugDirective.useOutputDirective === 'string') {
          const index = levels.indexOf(config.useDebugDirective.useOutputDirective.toUpperCase());
          config.useDebugDirective.useOutputDirective = -1 < index
            ? levels.slice(0, index + 1)
            : levels;
        }
      }
    }

    if (typeof config.port === 'string') {
      if (config.port.match(/^\d+$/u)) {
        config.port = parseInt(config.port, 10);
      }
      else {
        const match = config.port.match(/^(?<start>\d+)-(?<last>\d+)$/u);
        try {
          const commonMessage = 'Invalid value is set to `port` in `launch.json`.';
          let start: number, last: number;
          try {
            start = parseInt(match!.groups!.start, 10);
            last = parseInt(match!.groups!.last, 10);
          }
          catch (error) {
            throw Error(`${commonMessage} Please set it like "9000-9010". It may contain whitespace or irrelevant strings.`);
          }

          if (start === last) {
            throw Error(`${commonMessage} The values on the left and right are the same, please set it like "9000-9010".`);
          }
          else if (last <= start) {
            throw Error(`${commonMessage} Set a lower number on the left than on the right, like "${last}-${start}" instead of "${config.port}"`);
          }
          config.port = start;
          config.permittedPortRange = range(start, last + 1);
        }
        catch (error) {
          window.showErrorMessage(error.message);
          config.port = 9000;
          config.permittedPortRange = [ config.port ];
        }
      }
    }

    if (typeof config.runtimeArgs === 'undefined') {
      const editor = window.activeTextEditor;
      config.runtimeArgs = editor && editor.document.languageId.toLowerCase() === 'ahk'
        ? config.runtimeArgs_v1
        : config.runtimeArgs_v2; // ahk2 or ah2
    }
    if (!Array.isArray(config.runtimeArgs)) {
      config.runtimeArgs = [];
    }
    config.runtimeArgs = config.runtimeArgs.filter((arg) => arg.search(/\/debug/ui) === -1);
    config.runtimeArgs = config.runtimeArgs.filter((arg) => arg !== ''); // If a blank character is set here, AutoHotkey cannot be started. It is confusing for users to pass an empty string as an argument and generate an error, so fix it here.

    if (config.type === 'ahk') {
      window.showErrorMessage('As of version 1.3.7, the `type` of launch.json has been changed from `ahk` to ` It has been changed to `autohotkey`. Please edit launch.json now. If you do not edit it, you will not be able to debug it in the future.');
      config.type = 'autohotkey';
    }

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
  context.subscriptions.push(debug.registerDebugConfigurationProvider('autohotkey', provider));
  context.subscriptions.push(debug.registerDebugAdapterDescriptorFactory('autohotkey', new InlineDebugAdapterFactory()));

  context.subscriptions.push(languages.registerCompletionItemProvider([ 'ahk', 'ahk2', 'ah2', 'autohotkey' ], completionItemProvider, '.'));
};
