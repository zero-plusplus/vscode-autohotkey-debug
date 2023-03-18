/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable require-atomic-updates */
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import JSONC from 'jsonc-parser';
import { defaults, groupBy, isString, range } from 'lodash';
import tcpPortUsed from 'tcp-port-used';
import { CompletionItemProvider } from './CompletionItemProvider';
import { AhkDebugSession, DebugConfig, ExtraFeatures, PerfTipsConfig } from './ahkDebug';
import { getRunningAhkScriptList } from './util/getRunningAhkScriptList';
import normalizeToUnix from 'normalize-path';
import glob from 'fast-glob';
import { enableRunToEndOfFunction, registerCommands, setEnableRunToEndOfFunction } from './commands';
import { AhkVersion } from '@zero-plusplus/autohotkey-utilities';
import { isDirectory, reverseSearchPair, searchPair, timeoutPromise, toArray } from './util/util';
import { equalsIgnoreCase } from './util/stringUtils';
import { ExpressionExtractor } from './util/ExpressionExtractor';
import { defaultAutoHotkeyInstallDir, getAhkVersion, getAutohotkeyUxRuntimePath, getLaunchInfoByLauncher } from './util/AutoHotkeyLuncher';
import { CategoriesData, CategoryData, StackFrame } from './util/VariableManager';
import * as dbgp from './dbgpSession';
import { sync as pathExistsSync } from 'path-exists';

const ahkPathResolve = (filePath: string, autohotkeyInstallDir?: string): string => {
  let _filePath = filePath;
  if (!path.isAbsolute(filePath)) {
    _filePath = path.resolve(autohotkeyInstallDir ?? `${String(process.env.PROGRAMFILES)}/AutoHotkey`, filePath);
  }
  if (path.extname(_filePath) === '') {
    _filePath += '.exe';
  }
  return _filePath;
};
const normalizePath = (filePath: string): string => (filePath ? path.normalize(filePath) : filePath); // If pass in an empty string, path.normalize returns '.'
const normalizeCategories = (categories?: CategoriesData): CategoryData[] | undefined => {
  if (!categories) {
    return undefined;
  }
  if (categories === 'recommend') {
    return [
      {
        label: 'Local',
        source: 'Local',
      },
      {
        label: 'Static',
        source: 'Static',
      },
      {
        label: 'Global',
        source: 'Global',
        noduplicate: true,
        matchers: [ { method: 'exclude', pattern: '^\\d+$' } ],
      },
      {
        label: 'Built-in Global',
        source: 'Global',
        matchers: [
          { builtin: true },
          { method: 'exclude', pattern: '^\\d+$' },
        ],
      },
    ];
  }

  const normalized: CategoryData[] = [];
  for (const category of categories) {
    if (typeof category !== 'string') {
      normalized.push(category);
    }

    switch (category) {
      case 'Global': {
        normalized.push({
          label: 'Global',
          source: 'Global',
        });
        continue;
      }
      case 'Local': {
        normalized.push({
          label: 'Local',
          source: 'Local',
        });
        continue;
      }
      case 'Static': {
        normalized.push({
          label: 'Static',
          source: 'Static',
        });
        continue;
      }
      default: continue;
    }
  }

  const checkNoduplicate = (categoriesData: CategoryData[]): void => {
    const groupedCategoriesData = Object.entries(groupBy(categoriesData, (categoryData) => JSON.stringify(toArray<string>(categoryData.source).sort((a, b) => a.localeCompare(b)))));
    groupedCategoriesData;
    for (const [ , categoriesDataBySource ] of groupedCategoriesData) {
      const categoriesWithNoduplicate = categoriesDataBySource.filter((categoryData) => categoryData.noduplicate);
      if (categoriesWithNoduplicate.length === 0 || categoriesWithNoduplicate.length === 1) {
        continue;
      }

      const source = JSON.stringify(categoriesWithNoduplicate[0].source);
      throw Error(`There are multiple \`noduplicate\` attributes set for the category with \`${source}\` as the source. This attribute can only be set to one of the categories that have the same source.`);
    }
  };
  checkNoduplicate(normalized);
  return normalized;
};

export class AhkConfigurationProvider implements vscode.DebugConfigurationProvider {
  public config?: DebugConfig;
  public resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {
    if (config.extends) {
      const launch = folder
        ? JSONC.parse(readFileSync(path.resolve(folder.uri.fsPath, '.vscode', 'launch.json'), 'utf-8'))
        : vscode.workspace.getConfiguration().get<Record<string, any>>('launch');

      if (launch && 'configurations' in launch && Array.isArray(launch.configurations)) {
        const sourceConfig = launch.configurations.find((conf) => equalsIgnoreCase(conf.name, config.extends));
        if (!sourceConfig) {
          throw Error(`No matching configuration found. Please modify the \`extends\` attribute. \nSpecified: ${String(config.extends)}`);
        }
        defaults(config, sourceConfig);
      }
    }

    defaults(config, {
      name: 'AutoHotkey Debug',
      type: 'autohotkey',
      request: 'launch',
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
      useOutputDebug: true,
      useUIAVersion: false,
      useAnnounce: true,
      useLoadedScripts: true,
      useExceptionBreakpoint: false,
      setHiddenBreakpoints: [],
      trace: false,
      // The following is not a configuration, but is set to pass data to the debug adapter.
      cancelReason: undefined,
      autohotkeyInstallDirectory: defaultAutoHotkeyInstallDir,
    });

    if (config.openFileOnExit === '${file}' && !vscode.window.activeTextEditor) {
      config.openFileOnExit = undefined;
    }
    return config;
  }
  public async resolveDebugConfigurationWithSubstitutedVariables(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
    if (isDirectory(config.runtime)) {
      config.autohotkeyInstallDirectory = config.runtime;
      config.runtime = undefined;
    }

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
      if (config.runtime === undefined) {
        const doc = await vscode.workspace.openTextDocument(config.program ?? vscode.window.activeTextEditor?.document.uri.fsPath);
        const languageId = doc.languageId.toLowerCase();
        config.runtime = languageId === 'ahk'
          ? config.runtime_v1
          : config.runtime_v2; // ahk2 or ah2

        const defaultRuntime = path.resolve(path.dirname(config.program), `${path.parse(config.program).name}.exe`);
        if (config.runtime === undefined && existsSync(defaultRuntime)) {
          config.runtime = defaultRuntime;
        }

        if (config.runtime === undefined && existsSync(getAutohotkeyUxRuntimePath(config.autohotkeyInstallDirectory))) {
          const info = getLaunchInfoByLauncher(config.program, config.autohotkeyInstallDirectory);
          if (info) {
            config.runtimeArgs = Array.isArray(config.runtimeArgs) ? [ ...info.args, ...config.runtimeArgs ] : info.args;
            if (info.runtime === '') {
              // The requires version can be obtained, but for some reason the runtime may be an empty character. In that case, set the default value
              if (info.requires) {
                config.runtime = info.requires === '2'
                  ? 'v2/AutoHotkey.exe'
                  : 'Autohotkey.exe';
              }
            }
            else {
              config.runtime = info.runtime;
            }
          }
        }

        if (config.runtime === undefined) {
          config.runtime = languageId === 'ahk'
            ? 'AutoHotkey.exe'
            : 'v2/AutoHotkey.exe'; // ahk2 or ah2
        }
      }

      if (!isString(config.runtime)) {
        throw Error('`runtime` must be a string.');
      }
      if (config.runtime) {
        const autohotkeyInstallDir = isDirectory(config.runtime) ? config.runtime : defaultAutoHotkeyInstallDir;
        config.runtime = ahkPathResolve(config.runtime, autohotkeyInstallDir);
      }

      if (!existsSync(config.runtime)) {
        throw Error(`\`runtime\` must be a file path that exists.\nSpecified: "${String(normalizePath(config.runtime))}"`);
      }
    })();

    // init useUIAVersion
    ((): void => {
      if (typeof config.useUIAVersion !== 'boolean') {
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
        if (!ahkVersion) {
          throw Error(`\`runtime\` is not AutoHotkey runtime.\nSpecified: "${String(normalizePath(config.runtime))}"`);
        }

        if (typeof config.runtimeArgs_v1 === 'undefined') {
          config.runtimeArgs_v1 = ahkVersion.mejor <= 1.1 && ahkVersion.minor === 1 && 33 <= ahkVersion.patch
            ? [ '/ErrorStdOut=UTF-8' ]
            : [ '/ErrorStdOut' ];
        }
        if (typeof config.runtimeArgs_v2 === 'undefined') {
          config.runtimeArgs_v2 = 112 <= (ahkVersion.alpha ?? 0) || 0 < (ahkVersion.beta ?? 0)
            ? [ '/ErrorStdOut=UTF-8' ]
            : [ '/ErrorStdOut' ];
        }

        const doc = await vscode.workspace.openTextDocument(config.program);
        config.runtimeArgs = doc.languageId.toLowerCase() === 'ahk'
          ? config.runtimeArgs_v1
          : config.runtimeArgs_v2; // ahk2 or ah2

        config.runtimeArgs = config.runtimeArgs.filter((arg) => arg.search(/\/debug/ui) === -1);
        config.runtimeArgs = config.runtimeArgs.filter((arg) => arg !== ''); // If a blank character is set here, AutoHotkey cannot be started. It is confusing for users to pass an empty string as an argument and generate an error, so fix it here.
      }

      if (!Array.isArray(config.runtimeArgs)) {
        throw Error('`runtimeArgs` must be a array.');
      }
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
        const portUsed = await tcpPortUsed.check(port, config.hostname);
        if (!portUsed) {
          config.port = port;
          return;
        }
        if (!portRange.permitted) {
          const message = `Port number \`${port}\` is already in use. Would you like to start debugging using \`${port + 1}\`?\n If you don't want to see this message, set a value for \`port\` of \`launch.json\`.`;
          const result = await vscode.window.showInformationMessage(message, { modal: true }, 'Yes');
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
          config.program = '';
          config.cancelReason = `Canceled the attachment because no running AutoHotkey script was found.`;
          return;
        }
        if (config.program === undefined) {
          const scriptPath = await vscode.window.showQuickPick(scriptPathList);
          if (scriptPath) {
            config.program = scriptPath;
            return;
          }
          config.program = '';
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

    // init cwd
    ((): void => {
      if (!config.cwd) {
        config.cwd = path.dirname(config.program);
      }
      if (!isDirectory(config.cwd)) {
        throw Error(`\`cwd\` must be a absolute path of directory.\nSpecified: "${path.resolve(String(config.cwd))}"`);
      }
      config.cwd = path.resolve(config.cwd);
    })();

    // init args
    ((): void => {
      if (!Array.isArray(config.args)) {
        throw Error('`args` must be a array.');
      }
    })();

    // init env
    ((): void => {
      if (typeof config.env !== 'object' || Array.isArray(config.env)) {
        throw Error('`env` must be a object.');
      }

      const env = {};
      for (const [ key, value ] of Object.entries(process.env)) {
        env[key.toLowerCase()] = value;
      }
      for (const [ key, value ] of Object.entries(config.env)) {
        env[key.toLowerCase()] = value ?? '';
      }

      config.env = env;
    })();

    // init stopOnEntry
    ((): void => {
      if (typeof config.stopOnEntry !== 'boolean') {
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
      if (typeof config.useIntelliSenseInDebugging !== 'boolean') {
        throw Error('`useIntelliSenseInDebugging` must be a boolean.');
      }
    })();

    // init usePerfTips
    ((): void => {
      if (!(typeof config.usePerfTips === 'boolean' || typeof config.usePerfTips === 'string' || typeof config.usePerfTips === 'object') || Array.isArray(config.usePerfTips) || config.usePerfTips === null) {
        throw Error('`usePerfTips` must be a boolean, a string or a object.');
      }

      const defaultUsePerfTips = {
        fontColor: 'gray',
        fontStyle: 'italic',
        format: '{GetMetaVar("elapsedTime_s")}s elapsed',
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
      if (!(typeof config.useDebugDirective === 'boolean' || typeof config.useDebugDirective === 'object') || Array.isArray(config.useDebugDirective) || config.useDebugDirective === null) {
        throw Error('`useDebugDirective` must be a boolean or a object.');
      }
      if (config.useDebugDirective === false) {
        return;
      }

      const defaultDirectiveComment = {
        useBreakpointDirective: true,
        useOutputDirective: true,
        useClearConsoleDirective: true,
      };

      if (config.useDebugDirective === true) {
        config.useDebugDirective = defaultDirectiveComment;
        return;
      }
      defaults(config.useDebugDirective, defaultDirectiveComment);
    })();

    // init useAutoJumpToError
    ((): void => {
      if (typeof config.useAutoJumpToError !== 'boolean') {
        throw Error('`useAutoJumpToError` must be a boolean.');
      }
    })();

    // init useOutputDebug
    ((): void => {
      if (!(typeof config.useOutputDebug === 'boolean' || typeof config.useOutputDebug === 'object') || Array.isArray(config.useOutputDebug) || config.useOutputDebug === null) {
        throw Error('`useOutputDebug` must be a boolean or object.');
      }
      const defaultUseOutputDebug = {
        category: 'stderr',
        useTrailingLinebreak: false,
      };
      if (typeof config.useOutputDebug === 'object') {
        defaults(config.useOutputDebug, defaultUseOutputDebug);
        return;
      }
      if (config.useOutputDebug) {
        config.useOutputDebug = defaultUseOutputDebug;
      }
    })();

    // init skipFunctions
    ((): void => {
      if (!config.skipFunctions) {
        return;
      }
      if (!Array.isArray(config.skipFunctions)) {
        throw Error('`skipFunctions` must be a array of string.');
      }
    })();

    // init skipFiles
    await (async(): Promise<void> => {
      if (!config.skipFiles) {
        return;
      }
      if (!Array.isArray(config.skipFiles)) {
        throw Error('`skipFiles` must be a array of string.');
      }

      const skipFiles = config.skipFiles.map((filePath) => normalizeToUnix(String(filePath)));
      config.skipFiles = await glob(skipFiles, { onlyFiles: true, unique: true });
    })();

    // init useAnnounce
    ((): void => {
      if (!(typeof config.useAnnounce === 'boolean' || [ 'error', 'detail', 'develop' ].includes(config.useAnnounce))) {
        throw Error('`useAnnounce` must be a boolean, "error" or "detail".');
      }
    })();

    // init useLoadedScripts
    ((): void => {
      if (!(typeof config.useLoadedScripts === 'boolean' || typeof config.useLoadedScripts === 'object') || Array.isArray(config.useLoadedScripts) || config.useLoadedScripts === null) {
        throw Error('`useLoadedScripts` must be a boolean or object.');
      }

      const defaultValue = {
        scanImplicitLibrary: true,
      };
      if (config.useLoadedScripts === true) {
        config.useLoadedScripts = defaultValue;
      }
      else {
        defaults(config.useLoadedScripts, defaultValue);
      }
    })();

    // init useExceptionBreakpoint
    ((): void => {
      if (typeof config.useExceptionBreakpoint !== 'boolean') {
        throw Error('`useExceptionBreakpoint` must be a boolean.');
      }
    })();

    // init variableCategories
    ((): void => {
      if (!config.variableCategories) {
        return;
      }
      if (config.variableCategories === 'recommend' || Array.isArray(config.variableCategories)) {
        config.variableCategories = normalizeCategories(config.variableCategories as CategoriesData);
        return;
      }
      throw Error('`variableCategories` must be a "recommend" or array.');
    })();

    // init setHiddenBreakpoints
    ((): void => {
      if (!Array.isArray(config.setHiddenBreakpoints)) {
        throw Error('`setHiddenBreakpoints` must be a array.');
      }

      const checkHiddenBreakpoint = (value: any): boolean => {
        if (!('target' in value)) {
          throw Error('The `target` attribute is required.');
        }
        if (!(typeof value.target === 'string' || Array.isArray(value.target))) {
          throw Error('The `target` must be a string or array.');
        }
        if ('condition' in value && typeof value.condition !== 'string') {
          throw Error('The `condition` must be a string.');
        }
        if ('hitCondition' in value && typeof value.hitCondition !== 'string') {
          throw Error('The `hitCondition` must be a string.');
        }

        if (!('line' in value) || typeof value.line === 'undefined') {
          value.line = 1;
        }
        return true;
      };
      const checkHiddenBreakpointWithUI = (value: any): boolean => {
        if (!('label' in value) || typeof value.label !== 'string') {
          throw Error('The `label` must be a string.');
        }
        if (!('breakpoints' in value) || !Array.isArray(value.breakpoints)) {
          throw Error('The `breakpoints` must be a array.');
        }

        for (const breakpoint of value.breakpoints) {
          checkHiddenBreakpoint(breakpoint);
        }
        return true;
      };

      for (const setHiddenBreakpoint of config.setHiddenBreakpoints) {
        if (checkHiddenBreakpointWithUI(setHiddenBreakpoint) || checkHiddenBreakpoint(setHiddenBreakpoint)) {
          continue;
        }
      }
    })();

    // init trace
    ((): void => {
      if (typeof config.trace !== 'boolean') {
        throw Error('`trace` must be a boolean.');
      }
    })();

    this.config = config as unknown as DebugConfig;
    return config;
  }
}
export class InlineDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
  public readonly provider: AhkConfigurationProvider;
  public session?: AhkDebugSession;
  constructor(provider: AhkConfigurationProvider) {
    this.provider = provider;
  }
  public createDebugAdapterDescriptor(_session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    const perfTipsDecorationTypes: vscode.TextEditorDecorationType[] = [];
    const extraCommands: ExtraFeatures = {
      init: (session: AhkDebugSession): void => {
        this.session = session;
      },
      async runToEndOfFunctionBreakpoint(behavior): Promise<dbgp.ContinuationResponse | undefined> {
        if (!enableRunToEndOfFunction) {
          return undefined;
        }

        const result = behavior();
        setEnableRunToEndOfFunction(false);
        return result;
      },
      async displayPerfTips(session: AhkDebugSession, stackFrame: StackFrame, config: PerfTipsConfig) {
        if (!session.logEvalutor) {
          return;
        }

        const { source, line } = stackFrame;
        const document = await vscode.workspace.openTextDocument(source.path);
        let line_0base = line - 1;
        if (line_0base === document.lineCount) {
          line_0base--; // I don't know about the details, but if the script stops at the end of the file and it's not a blank line, then line_0base will be the value of `document.lineCount + 1`, so we'll compensate for that
        }

        const { format, fontColor, fontStyle } = config;
        const logDataList = await timeoutPromise(session.logEvalutor.eval(format), 5000);
        if (!logDataList || logDataList.length === 0 || logDataList[0].type === 'object') {
          return;
        }

        const message = String(logDataList[0].value);
        const decorationType = vscode.window.createTextEditorDecorationType({
          after: {
            fontStyle,
            color: fontColor,
            contentText: ` ${message}`,
          },
        });
        perfTipsDecorationTypes.push(decorationType);

        const textLine = document.lineAt(line_0base);
        const startPosition = textLine.range.end;
        const endPosition = new vscode.Position(line_0base, textLine.range.end.character + message.length - 1);
        const decoration = { range: new vscode.Range(startPosition, endPosition) } as vscode.DecorationOptions;

        const editor = await vscode.window.showTextDocument(document);
        if (session.isSessionTerminated) {
          return; // If debugging terminated while the step is running, the decorations may remain display
        }
        editor.setDecorations(decorationType, [ decoration ]);
      },
      clearPerfTips(): void {
        for (const editor of vscode.window.visibleTextEditors) {
          for (const decorationType of perfTipsDecorationTypes) {
            editor.setDecorations(decorationType, []);
          }
        }
      },
      async clearDebugConsole(): Promise<void> {
        // There is a lag between the execution of a command and the console being cleared. This lag can be eliminated by executing the command multiple times.
        await vscode.commands.executeCommand('workbench.debug.panel.action.clearReplAction');
        await vscode.commands.executeCommand('workbench.debug.panel.action.clearReplAction');
        await vscode.commands.executeCommand('workbench.debug.panel.action.clearReplAction');
      },
      async showErrorMessage(message: string): Promise<void> {
        await vscode.window.showErrorMessage(message);
      },
      async jumpToError(errorMessage: string): Promise<boolean> {
        const match = errorMessage.match(/^(?<filePath>.+):(?<line>\d+)(?=\s:\s==>)/u);
        if (!match?.groups) {
          return false;
        }

        const { filePath, line } = match.groups;
        const _line = parseInt(line, 10) - 1;

        const doc = await vscode.workspace.openTextDocument(filePath);
        const lineRange = doc.lineAt(_line).range;
        const lineText = doc.getText(lineRange);
        const leadingSpace = lineText.match(/^(?<space>\s*)/u)?.groups?.space ?? '';
        const trailingSpace = lineText.match(/(?<space>\s+)$/u)?.groups?.space ?? '';
        const startPosition = new vscode.Position(_line, leadingSpace.length);
        const endPosition = new vscode.Position(_line, lineText.length - trailingSpace.length);
        const editor = await vscode.window.showTextDocument(doc, {
          selection: new vscode.Range(startPosition, startPosition),
        });

        const decorationType = vscode.window.createTextEditorDecorationType({
          backgroundColor: new vscode.ThemeColor('editor.symbolHighlightBackground'),
        });
        const decoration: vscode.DecorationOptions = { range: new vscode.Range(startPosition, endPosition) };
        editor.setDecorations(decorationType, [ decoration ]);
        setTimeout(() => {
          editor.setDecorations(decorationType, []);
        }, 500);

        return true;
      },
      async openFileOnExit(filePath) {
        if (!pathExistsSync(filePath)) {
          await this.showErrorMessage(`File not found. Value of \`openFileOnExit\` in launch.json: \`${filePath}\``);
        }

        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
      },
    };

    return new vscode.DebugAdapterInlineImplementation(new AhkDebugSession(this.provider as { config: DebugConfig }, extraCommands));
  }
}

export const activate = (context: vscode.ExtensionContext): void => {
  const provider = new AhkConfigurationProvider();
  const factory = new InlineDebugAdapterFactory(provider);

  registerCommands(context);

  context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('ahk', provider));
  context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('autohotkey', provider));
  context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('autohotkey', factory));
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider([ 'ahk', 'ahk2', 'ah2' ], new CompletionItemProvider(factory), '.'));

  const findExpressionRange = (expressionExtractor: ExpressionExtractor, document: vscode.TextDocument, position: vscode.Position, offset = 0): vscode.Range | undefined => {
    const range = document.getWordRangeAtPosition(position) ?? new vscode.Range(position, position);

    const lineText = document.lineAt(position).text;
    const charOnCursor = lineText.at(position.character);
    if (charOnCursor === '[') {
      const pairIndex = searchPair(lineText, '[', ']');
      const range = findExpressionRange(expressionExtractor, document, new vscode.Position(position.line, position.character - 1));
      if (!range) {
        return undefined;
      }
      return new vscode.Range(range.start, new vscode.Position(position.line, pairIndex + 1));
    }
    if (charOnCursor === ']') {
      const pairIndex = reverseSearchPair(lineText, ']', '[');
      const range = findExpressionRange(expressionExtractor, document, new vscode.Position(position.line, pairIndex));
      if (!range) {
        return undefined;
      }
      return new vscode.Range(range.start, new vscode.Position(position.line, position.character + 1));
    }

    const { data, object, operator } = expressionExtractor.extract(lineText.slice(0, position.character));

    const startIndex = position.character - data.length;
    const fixedRange = new vscode.Range(new vscode.Position(position.line, startIndex), range.end);
    if (operator === '["' || operator === `['`) {
      const bracketNotation = lineText.slice(object.length + startIndex);
      const pairIndex = searchPair(bracketNotation, '[', ']');
      if (pairIndex === -1) {
        return fixedRange;
      }
      const endIndex = startIndex + object.length + pairIndex + 1;
      return new vscode.Range(
        fixedRange.start,
        new vscode.Position(fixedRange.end.line, endIndex),
      );
    }
    return fixedRange;
  };
  const expressionExtractor_v1 = new ExpressionExtractor(new AhkVersion('1.0'));
  context.subscriptions.push(vscode.languages.registerEvaluatableExpressionProvider([ 'ahk' ], {
    provideEvaluatableExpression(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.EvaluatableExpression> {
      const range = findExpressionRange(expressionExtractor_v1, document, position);
      if (!range) {
        return undefined;
      }
      return new vscode.EvaluatableExpression(range);
    },
  }));
  const expressionExtractor_v2 = new ExpressionExtractor(new AhkVersion('2.0'));
  context.subscriptions.push(vscode.languages.registerEvaluatableExpressionProvider([ 'ahk2', 'ah2' ], {
    provideEvaluatableExpression(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.EvaluatableExpression> {
      const range = findExpressionRange(expressionExtractor_v2, document, position);
      if (!range) {
        return undefined;
      }
      return new vscode.EvaluatableExpression(range);
    },
  }));
};
