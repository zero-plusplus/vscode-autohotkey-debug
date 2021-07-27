import { existsSync } from 'fs';
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
import { isArray, isBoolean, isPlainObject } from 'ts-predicates';
import { defaults, isString, range } from 'lodash';
import * as isPortTaken from 'is-port-taken';
import { getAhkVersion } from './util/getAhkVersion';
import { completionItemProvider } from './CompletionItemProvider';
import { AhkDebugSession } from './ahkDebug';

const normalizePath = (filePath: string): string => (filePath ? path.normalize(filePath) : filePath); // If pass in an empty string, path.normalize returns '.'
class AhkConfigurationProvider implements DebugConfigurationProvider {
  public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
    defaults(config, {
      name: 'AutoHotkey Debug',
      type: 'autohotkey',
      request: 'launch',
      runtime_v1: 'AutoHotkey.exe',
      runtime_v2: 'v2/AutoHotkey.exe',
      hostname: 'localhost',
      port: 9002,
      program: '${file}',
      args: [],
      env: {},
      stopOnEntry: false,
      maxChildren: 10000,
      useIntelliSenseInDebugging: true,
      usePerfTips: false,
      useDebugDirective: false,
      trace: false,
    });

    // Deprecated. I''ll get rid of it eventually
    if (config.type === 'ahk') {
      window.showErrorMessage('As of version 1.3.7, the `type` of launch.json has been changed from `ahk` to ` It has been changed to `autohotkey`. Please edit launch.json now. If you do not edit it, you will not be able to debug it in the future.');
      config.type = 'autohotkey';
    }

    return config;
  }
  public async resolveDebugConfigurationWithSubstitutedVariables(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): Promise<DebugConfiguration> {
    // init request
    ((): void => {
      if (config.request === 'launch') {
        return;
      }

      const commonErrorMessage = '`type` must be "launch".';
      if (config.request === 'attach') {
        throw Error(`${commonErrorMessage} "attach" is not supported.`);
      }
      throw Error(commonErrorMessage);
    })();

    // init runtime
    ((): void => {
      if (typeof config.runtime === 'undefined') {
        const editor = window.activeTextEditor;
        config.runtime = editor && editor.document.languageId.toLowerCase() === 'ahk'
          ? config.runtime_v1
          : config.runtime_v2; // ahk2 or ah2
      }

      if (!isString(config.runtime)) {
        throw Error('`runtime` must be a string.');
      }
      if (config.runtime) {
        if (!path.isAbsolute(config.runtime)) {
          const ahkPath = `${String(process.env.PROGRAMFILES)}/AutoHotkey`;
          config.runtime = path.resolve(ahkPath, config.runtime);
        }
        if (path.extname(config.runtime) === '') {
          config.runtime += '.exe';
        }
      }

      if (!existsSync(config.runtime)) {
        throw Error(`\`runtime\` must be a file path that exists.\nSpecified: "${String(normalizePath(config.runtime))}"`);
      }
    })();

    // init runtimeArgs
    ((): void => {
      if (typeof config.runtimeArgs === 'undefined') {
        const ahkVersion = getAhkVersion(config.runtime, { env: config.env });
        if (ahkVersion === null) {
          throw Error(`\`runtime\` is not AutoHotkey runtime.\nSpecified: "${String(normalizePath(config.runtime))}"`);
        }

        if (typeof config.runtimeArgs_v1 === 'undefined') {
          config.runtimeArgs_v1 = ahkVersion.mejor === 1 && ahkVersion.minor === 1 && 33 <= ahkVersion.teeny
            ? [ '/ErrorStdOut=UTF-8' ]
            : [ '/ErrorStdOut' ];
        }
        if (typeof config.runtimeArgs_v2 === 'undefined') {
          config.runtimeArgs_v2 = 112 <= ahkVersion.alpha || 0 < ahkVersion.beta
            ? [ '/ErrorStdOut=UTF-8' ]
            : [ '/ErrorStdOut' ];
        }

        const editor = window.activeTextEditor;
        config.runtimeArgs = editor && editor.document.languageId.toLowerCase() === 'ahk'
          ? config.runtimeArgs_v1
          : config.runtimeArgs_v2; // ahk2 or ah2

        config.runtimeArgs = config.runtimeArgs.filter((arg) => arg.search(/\/debug/ui) === -1);
        config.runtimeArgs = config.runtimeArgs.filter((arg) => arg !== ''); // If a blank character is set here, AutoHotkey cannot be started. It is confusing for users to pass an empty string as an argument and generate an error, so fix it here.
      }

      if (isArray(config.runtimeArgs)) {
        return;
      }
      throw Error('`runtimeArgs` must be a array.');
    })();

    // init hostname
    ((): void => {
      if (!isString(config.hostname)) {
        throw Error('`hostname` must be a string.');
      }
    })();

    // init port
    await (async(): Promise<void> => {
      const portRange = ((): { permitted: boolean; range: number[] } => {
        const createUnPermittedPortRange = (port: number): { permitted: boolean; range: number[] } => {
          return { permitted: false, range: range(port, port + 100) };
        };

        if (Number.isInteger(config.port)) {
          return createUnPermittedPortRange(config.port as number);
        }
        else if (typeof config.port === 'string') {
          if (config.port.match(/^\d+$/u)) {
            return createUnPermittedPortRange(parseInt(config.port, 10));
          }

          const errorMessage = 'It must be specified in the format of "start-last". It must be start < last. e.g. "9002-9010"';
          const match = config.port.match(/^(?<start>\d+)-(?<last>\d+)$/u);
          if (!match) {
            throw Error(errorMessage);
          }
          if (!match.groups) {
            throw Error(errorMessage);
          }

          const start = parseInt(match.groups.start, 10);
          const last = parseInt(match.groups.last, 10);
          if (isNaN(start) || isNaN(last)) {
            throw Error(errorMessage);
          }
          if (start === last) {
            throw Error(errorMessage);
          }
          if (last <= start) {
            throw Error(errorMessage);
          }
          return { permitted: true, range: range(start, last + 1) };
        }

        throw Error('`port` must be a number or a string of `start-last` format. e.g. "9002-9010"');
      })();

      for await (const port of portRange.range) {
        const portUsed = await isPortTaken(port, config.hostname);
        if (!portUsed) {
          // eslint-disable-next-line require-atomic-updates
          config.port = port;
          return;
        }
        if (!portRange.permitted) {
          const message = `Port number \`${port}\` is already in use. Would you like to start debugging using \`${port + 1}\`?\n If you don't want to see this message, set a value for \`port\` of \`launch.json\`.`;
          const result = await window.showInformationMessage(message, { modal: true }, 'Yes');
          if (!result) {
            break;
          }
        }
      }

      throw Error('`port` must be an unused port number.');
    })();

    // init program
    ((): void => {
      if (!isString(config.program)) {
        throw Error('`program` must be a string.');
      }
      if (!existsSync(config.program)) {
        throw Error(`\`program\` must be a file path that exists.\nSpecified: "${String(normalizePath(config.program))}"`);
      }
    })();

    // init args
    ((): void => {
      if (!isArray(config.args)) {
        throw Error('`args` must be a array.');
      }
    })();

    // init env
    ((): void => {
      if (!isPlainObject(config.env)) {
        throw Error('`env` must be a object.');
      }

      const env = {};
      for (const [ key, value ] of Object.entries(process.env)) {
        env[key.toLowerCase()] = value;
      }
      for (const [ key, value ] of Object.entries(config.env)) {
        const a = value ?? '';
        a;
        env[key.toLowerCase()] = value ?? '';
      }

      config.env = env;
    })();

    // init stopOnEntry
    ((): void => {
      if (!isBoolean(config.stopOnEntry)) {
        throw Error('`stopOnEntry` must be a boolean.');
      }
    })();

    // init maxChildren
    ((): void => {
      if (!Number.isInteger(config.maxChildren)) {
        throw Error('`maxChildren` must be a integer.');
      }
    })();

    // init openFileOnExit
    ((): void => {
      if (typeof config.openFileOnExit === 'undefined') {
        return;
      }

      if (!isString(config.openFileOnExit)) {
        throw Error('`openFileOnExit` must be a string.');
      }
      if (!existsSync(config.openFileOnExit)) {
        throw Error(`\`openFileOnExit\` must be a file path that exists.\nSpecified: "${String(normalizePath(config.openFileOnExit))}"`);
      }
    })();

    // init useIntelliSenseInDebugging
    ((): void => {
      if (!isBoolean(config.useIntelliSenseInDebugging)) {
        throw Error('`useIntelliSenseInDebugging` must be a boolean.');
      }
    })();

    // init usePerfTips
    ((): void => {
      if (!(isBoolean(config.usePerfTips) || isString(config.usePerfTips) || isPlainObject(config.usePerfTips))) {
        throw Error('`usePerfTips` must be a boolean, a string or a object.');
      }

      const defaultUsePerfTips = {
        fontColor: 'gray',
        fontStyle: 'italic',
        format: '{{elapsedTime_s}}s elapsed',
      };

      if (config.usePerfTips === true) {
        config.usePerfTips = defaultUsePerfTips;
        return;
      }
      if (typeof config.usePerfTips === 'string') {
        config.usePerfTips = { format: config.usePerfTips };
        return;
      }
      defaults(config.usePerfTips, defaultUsePerfTips);
    })();

    // init useDebugDirective
    ((): void => {
      if (!(isBoolean(config.useDebugDirective) || isPlainObject(config.useDebugDirective))) {
        throw Error('`useDebugDirective` must be a boolean or a object.');
      }
      if (config.useDebugDirective === false) {
        return;
      }

      const defaultDirectiveComment = {
        useBreakpointDirective: true,
        useOutputDirective: true,
      };

      if (config.useDebugDirective === true) {
        config.useDebugDirective = defaultDirectiveComment;
        return;
      }
      defaults(config.useDebugDirective, defaultDirectiveComment);
    })();

    // init trace
    ((): void => {
      if (!isBoolean(config.trace)) {
        throw Error('`trace` must be a boolean.');
      }
    })();

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
