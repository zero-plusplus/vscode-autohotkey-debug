/* eslint-disable require-atomic-updates */
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
  workspace,
} from 'vscode';
import { isArray, isBoolean, isPlainObject } from 'ts-predicates';
import { defaults, isString, range } from 'lodash';
import * as isPortTaken from 'is-port-taken';
import { getAhkVersion } from './util/getAhkVersion';
import { completionItemProvider } from './CompletionItemProvider';
import { AhkDebugSession } from './ahkDebug';
import { getRunningAhkScriptList } from './util/getRunningAhkScriptList';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import normalizeToUnix = require('normalize-path');
import * as glob from 'fast-glob';

const ahkPathResolve = (filePath: string, cwd?: string): string => {
  let _filePath = filePath;
  if (!path.isAbsolute(filePath)) {
    _filePath = path.resolve(cwd ?? `${String(process.env.PROGRAMFILES)}/AutoHotkey`, filePath);
  }
  if (path.extname(_filePath) === '') {
    _filePath += '.exe';
  }
  return _filePath;
};
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
      program: config.request === 'launch' || !config.request ? '${file}' : undefined,
      args: [],
      env: {},
      stopOnEntry: false,
      maxChildren: 10000,
      useIntelliSenseInDebugging: true,
      usePerfTips: false,
      useDebugDirective: false,
      useAutoJumpToError: false,
      useUIAVersion: false,
      trace: false,
      cancelReason: undefined,
    });

    // Deprecated. I''ll get rid of it eventually
    if (config.type === 'ahk') {
      window.showErrorMessage('As of version 1.3.7, the `type` of launch.json has been changed from `ahk` to ` It has been changed to `autohotkey`. Please edit launch.json now. If you do not edit it, you will not be able to debug it in the future.');
      config.type = 'autohotkey';
    }

    if (config.openFileOnExit === '${file}' && !window.activeTextEditor) {
      config.openFileOnExit = undefined;
    }
    return config;
  }
  public async resolveDebugConfigurationWithSubstitutedVariables(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): Promise<DebugConfiguration> {
    // init request
    ((): void => {
      if (config.request === 'launch') {
        return;
      }
      if (config.request === 'attach') {
        return;
      }

      throw Error('`request` must be "launch" or "attach".');
    })();

    // init runtime
    await (async(): Promise<void> => {
      if (typeof config.runtime === 'undefined') {
        const doc = await workspace.openTextDocument(config.program ?? window.activeTextEditor?.document.uri.fsPath);
        config.runtime = doc.languageId.toLowerCase() === 'ahk'
          ? config.runtime_v1
          : config.runtime_v2; // ahk2 or ah2
      }

      if (!isString(config.runtime)) {
        throw Error('`runtime` must be a string.');
      }
      if (config.runtime) {
        config.runtime = ahkPathResolve(config.runtime);
        return;
      }

      if (!existsSync(config.runtime)) {
        throw Error(`\`runtime\` must be a file path that exists.\nSpecified: "${String(normalizePath(config.runtime))}"`);
      }
    })();

    // init useUIAVersion
    ((): void => {
      if (!isBoolean(config.useUIAVersion)) {
        throw Error('`useUIAVersion` must be a boolean.');
      }
    })();

    // init runtimeArgs
    await (async(): Promise<void> => {
      if (config.useUIAVersion) {
        if (!config.runtimeArgs) {
          config.runtimeArgs = [];
        }
        return;
      }
      else if (typeof config.runtimeArgs === 'undefined') {
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

        const doc = await workspace.openTextDocument(config.program);
        config.runtimeArgs = doc.languageId.toLowerCase() === 'ahk'
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
      if (config.hostname.toLowerCase() === 'localhost') {
        config.hostname = '127.0.0.1';
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
    await (async(): Promise<void> => {
      if (config.request === 'attach') {
        const scriptPathList = getRunningAhkScriptList(config.runtime);
        if (scriptPathList.length === 0) {
          config.cancelReason = `Canceled the attachment because no running AutoHotkey script was found.`;
          return;
        }
        if (config.program === undefined) {
          const scriptPath = await window.showQuickPick(scriptPathList);
          if (scriptPath) {
            config.program = scriptPath;
            return;
          }
          config.cancelReason = `Cancel the attach.`;
          return;
        }
        const isRunning = scriptPathList.map((scriptPath) => path.resolve(scriptPath.toLocaleLowerCase())).includes(path.resolve(config.program).toLowerCase());
        if (!isRunning) {
          config.cancelReason = `Canceled the attach because "${String(config.program)}" is not running.`;
        }
      }
      if (!isString(config.program)) {
        throw Error('`program` must be a string.');
      }
      if (config.request === 'launch' && !existsSync(config.program)) {
        throw Error(`\`program\` must be a file path that exists.\nSpecified: "${String(normalizePath(config.program))}"`);
      }
      if (config.program) {
        config.program = path.resolve(config.program);
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

    // init useAutoJumpToError
    ((): void => {
      if (!isBoolean(config.useAutoJumpToError)) {
        throw Error('`useAutoJumpToError` must be a boolean.');
      }
    })();

    // init skipFunctions
    ((): void => {
      if (!config.skipFunctions) {
        return;
      }
      if (!isArray(config.skipFunctions)) {
        throw Error('`skipFunctions` must be a array of string.');
      }
    })();

    // init skipFiles
    await (async(): Promise<void> => {
      if (!config.skipFiles) {
        return;
      }
      if (!isArray(config.skipFiles)) {
        throw Error('`skipFiles` must be a array of string.');
      }
      const skipFiles = config.skipFiles.map((filePath) => normalizeToUnix(String(filePath)));
      config.skipFiles = await glob(skipFiles, { onlyFiles: true, unique: true });
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

export const activate = (context: ExtensionContext): void => {
  const provider = new AhkConfigurationProvider();

  context.subscriptions.push(debug.registerDebugConfigurationProvider('ahk', provider));
  context.subscriptions.push(debug.registerDebugConfigurationProvider('autohotkey', provider));
  context.subscriptions.push(debug.registerDebugAdapterDescriptorFactory('autohotkey', new InlineDebugAdapterFactory()));

  context.subscriptions.push(languages.registerCompletionItemProvider([ 'ahk', 'ahk2', 'ah2', 'autohotkey' ], completionItemProvider, '.'));
};
