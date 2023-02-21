import * as path from 'path';
import * as net from 'net';
import { stat } from 'fs';
import wildcard from 'wildcard-match';
import * as sym from './util/SymbolFinder';

import * as vscode from 'vscode';
import {
  InitializedEvent,
  LoggingDebugSession,
  OutputEvent,
  StoppedEvent,
  TerminatedEvent,
  Thread,
  ThreadEvent,
} from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';
import { URI } from 'vscode-uri';
import { sync as pathExistsSync } from 'path-exists';
import AsyncLock from 'async-lock';
import { chunk, range } from 'lodash';
import LazyPromise from 'lazy-promise';
import { AhkVersion, ImplicitLibraryPathExtractor, IncludePathExtractor } from '@zero-plusplus/autohotkey-utilities';
import {
  Breakpoint,
  BreakpointAction,
  BreakpointAdvancedData,
  BreakpointManager,
  LineBreakpoints,
} from './util/BreakpointManager';
import { toFixed } from './util/numberUtils';
import { equalsIgnoreCase } from './util/stringUtils';
import { TraceLogger } from './util/TraceLogger';
import { completionItemProvider, createCompletionDetail, createCompletionLabel, createCompletionSortText, toDotNotation } from './CompletionItemProvider';
import * as dbgp from './dbgpSession';
import { AutoHotkeyLauncher, AutoHotkeyProcess } from './util/AutoHotkeyLuncher';
import { now, readFileCache, readFileCacheSync, searchPair, timeoutPromise, toFileUri } from './util/util';
import matcher from 'matcher';
import { Categories, Category, MetaVariable, MetaVariableValueMap, Scope, StackFrames, Variable, VariableManager, formatProperty } from './util/VariableManager';
import { AhkConfigurationProvider, CategoryData } from './extension';
import { version as debuggerAdapterVersion } from '../package.json';
import { SymbolFinder } from './util/SymbolFinder';
import { ExpressionEvaluator, ParseError, toJavaScriptBoolean, toType } from './util/evaluator/ExpressionEvaluator';
import { enableRunToEndOfFunction, setEnableRunToEndOfFunction } from './commands';
import { CaseInsensitiveMap } from './util/CaseInsensitiveMap';
import { IntelliSense } from './util/IntelliSense';
import { maskQuotes } from './util/ExpressionExtractor';
import { DebugDirectiveParser } from './util/DebugDirectiveParser';
import { LogData, LogEvaluator } from './util/evaluator/LogEvaluator';
import { ActionLogPrefixData, CategoryLogPrefixData, GroupLogPrefixData } from './util/evaluator/LogParser';

export type AnnounceLevel = boolean | 'error' | 'detail';
export type FunctionBreakPointAdvancedData = { name: string; condition?: string; hitCondition?: string; logPoint?: string };

export type MatchSelector = undefined | 'first' | 'last' | 'all' | number | number[];
export type LineMatcher =
  | number
  | number[]
  | RegExLineMatcher;
export interface RegExLineMatcher {
  pattern: string;
  ignoreCase?: boolean;
  select?: MatchSelector;
  offset?: number;
}
export type LineMatchResult = { line: number; match?: RegExpMatchArray };
export type HiddenBreakpointActionName = 'ClearConsole';
export interface HiddenBreakpoint {
  target: string | string[];
  line: LineMatcher;
  condition?: string;
  hitCondition?: string;
  log?: string;
  break: boolean;
  action?: HiddenBreakpointActionName;
}
export interface HiddenBreakpointWithUI {
  id: string;
  label: string;
  breakpoints: HiddenBreakpoint[];
}

export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments, DebugProtocol.AttachRequestArguments {
  name: string;
  program: string;
  request: 'launch' | 'attach';
  runtime: string;
  cwd: string;
  runtimeArgs: string[];
  args: string[];
  env: NodeJS.ProcessEnv;
  stopOnEntry: boolean;
  hostname: string;
  port: number;
  maxChildren: number;
  usePerfTips: false | {
    fontColor: string;
    fontStyle: string;
    format: string;
  };
  useIntelliSenseInDebugging: boolean;
  useDebugDirective: false | {
    useBreakpointDirective: boolean;
    useOutputDirective: boolean;
    useClearConsoleDirective: boolean;
  };
  useAutoJumpToError: boolean;
  useUIAVersion: boolean;
  useOutputDebug: false | {
    category: 'stdout' | 'stderr' | 'console';
    useTrailingLinebreak: boolean;
  };
  useAnnounce: AnnounceLevel;
  useLoadedScripts: false | {
    scanImplicitLibrary: boolean;
  };
  useExceptionBreakpoint: boolean;
  openFileOnExit: string;
  trace: boolean;
  skipFunctions?: string[];
  skipFiles?: string[];
  variableCategories?: CategoryData[];
  setHiddenBreakpoints?: Array<HiddenBreakpoint | HiddenBreakpointWithUI>;
  // The following is not a configuration, but is set to pass data to the debug adapter.
  cancelReason?: string;
  extensionContext: vscode.ExtensionContext;
}

type LogCategory = 'console' | 'stdout' | 'stderr';
type StopReason = 'step' | 'breakpoint' | 'hidden breakpoint' | 'pause' | 'exception' | 'error';
export const serializePromise = async(promises: Array<Promise<void>>): Promise<void> => {
  await promises.reduce(async(prev, current): Promise<void> => {
    return prev.then(async() => current);
  }, Promise.resolve());
};

const asyncLock = new AsyncLock();
export class AhkDebugSession extends LoggingDebugSession {
  public session?: dbgp.Session;
  public config!: LaunchRequestArguments;
  private readonly traceLogger: TraceLogger;
  private errorCounter = 0;
  private autoExecuting = false;
  private pauseRequested = false;
  private isPaused = false;
  private isTerminateRequested = false;
  private readonly configProvider: AhkConfigurationProvider;
  private symbolFinder?: sym.SymbolFinder;
  private symbols?: sym.NamedNode[];
  private callableSymbols?: sym.NamedNode[];
  private hiddenBreakpoints?: HiddenBreakpoint[];
  private hiddenBreakpointsWithUI?: HiddenBreakpointWithUI[];
  private exceptionArgs?: DebugProtocol.SetExceptionBreakpointsArguments;
  private server?: net.Server;
  private ahkProcess?: AutoHotkeyProcess;
  private readonly metaVaribalesByFrameId = new Map<number, MetaVariableValueMap>();
  private variableManager?: VariableManager;
  private readonly logObjectsMap = new Map<number, (Variable | Scope | Category | Categories | MetaVariable | undefined)>();
  private breakpointManager?: BreakpointManager;
  private readonly registeredFunctionBreakpoints: Breakpoint[] = [];
  private evaluator!: ExpressionEvaluator;
  private intellisense?: IntelliSense;
  private prevStackFrames?: StackFrames;
  private currentStackFrames?: StackFrames;
  private readonly currentMetaVariableMap = new MetaVariableValueMap();
  private stackFramesWhenStepOut?: StackFrames;
  private stackFramesWhenStepOver?: StackFrames;
  private readonly perfTipsDecorationTypes: vscode.TextEditorDecorationType[] = [];
  private readonly loadedSources: string[] = [];
  private errorMessage = '';
  private isTimeout = false;
  private exitCode?: number | undefined;
  private raisedCriticalError?: boolean;
  // The warning message is processed earlier than the server initialization, so it needs to be delayed.
  private readonly delayedWarningMessages: string[] = [];
  private logEvalutor?: LogEvaluator;
  constructor(provider: AhkConfigurationProvider) {
    super('autohotkey-debug.txt');

    this.configProvider = provider;
    this.traceLogger = new TraceLogger((e): void => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.sendEvent(e);
    });
    this.setDebuggerColumnsStartAt1(true);
    this.setDebuggerLinesStartAt1(true);
    this.setDebuggerPathFormat('uri');
  }
  private get isClosedSession(): boolean {
    return this.session!.socketClosed || this.isTerminateRequested;
  }
  protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
    response.body = {
      completionTriggerCharacters: [ '.' ],
      supportsCompletionsRequest: true,
      supportsConditionalBreakpoints: true,
      supportsConfigurationDoneRequest: true,
      supportsEvaluateForHovers: true,
      supportsSetExpression: true,
      supportsHitConditionalBreakpoints: true,
      supportsFunctionBreakpoints: true,
      supportsLoadedSourcesRequest: true,
      supportsLogPoints: true,
      supportsSetVariable: true,
      supportTerminateDebuggee: true,
    };

    const config = this.configProvider.config;
    if (config?.setHiddenBreakpoints) {
      this.hiddenBreakpoints = config.setHiddenBreakpoints.filter((hiddenBreakpoint) => !('label' in hiddenBreakpoint)) as HiddenBreakpoint[];
      this.hiddenBreakpointsWithUI = config.setHiddenBreakpoints.filter((hiddenBreakpoint) => 'label' in hiddenBreakpoint) as HiddenBreakpointWithUI[];

      response.body.exceptionBreakpointFilters = Array.isArray(response.body.exceptionBreakpointFilters)
        ? response.body.exceptionBreakpointFilters
        : [];
      response.body.exceptionBreakpointFilters.push(...this.hiddenBreakpointsWithUI.map((hiddenBreakpoint, i): DebugProtocol.ExceptionBreakpointsFilter => {
        hiddenBreakpoint.id = `hidden-breakpoint-${i}`;
        return {
          label: hiddenBreakpoint.label,
          filter: hiddenBreakpoint.id,
          supportsCondition: false,
          default: false,
        };
      }));
    }

    if (config?.useExceptionBreakpoint) {
      response.body.supportsExceptionOptions = true;
      response.body.supportsExceptionFilterOptions = true;
      response.body.supportsExceptionInfoRequest = true;

      response.body.exceptionBreakpointFilters = Array.isArray(response.body.exceptionBreakpointFilters)
        ? response.body.exceptionBreakpointFilters
        : [];
      response.body.exceptionBreakpointFilters.push(...[
        {
          filter: 'caught-exceptions',
          label: 'Caught Exceptions',
          conditionDescription: '',
          description: '',
          supportsCondition: true,
          default: false,
        },
        {
          filter: 'uncaught-exceptions',
          label: 'Uncaught Exceptions',
          conditionDescription: '',
          description: '',
          supportsCondition: false,
          default: false,
        },
      ] as DebugProtocol.ExceptionBreakpointsFilter[]);
    }

    this.sendResponse(response);
  }
  protected async disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('disconnectRequest');
    this.clearPerfTipsDecorations();

    if (this.session?.socketWritable) {
      if (args.restart && this.config.request === 'attach') {
        await timeoutPromise(this.session.sendDetachCommand(), 500).catch(() => {
          this.ahkProcess?.close();
        });
      }
      else if (args.terminateDebuggee === undefined || args.terminateDebuggee) {
        await timeoutPromise(this.session.sendStopCommand(), 500).catch(() => {
          this.ahkProcess?.close();
        });
      }
      else {
        await timeoutPromise(this.session.sendDetachCommand(), 500).catch(() => {
          this.ahkProcess?.close();
        });
      }
    }

    if (!args.restart && !this.isTimeout) {
      if (this.raisedCriticalError) {
        this.sendAnnounce('Debugging stopped');
      }
      else if (typeof this.exitCode === 'number') {
        this.sendAnnounce(`AutoHotkey closed for the following exit code: ${this.exitCode}`, this.exitCode === 0 ? 'console' : 'stderr', this.exitCode === 0 ? 'detail' : 'error');
        this.sendAnnounce('Debugging stopped');
      }
      else if (args.terminateDebuggee === true && !this.config.cancelReason) {
        this.sendAnnounce(this.config.request === 'launch' ? 'Debugging stopped.' : 'Attaching and AutoHotkey stopped.');
      }
      else if (args.terminateDebuggee === false && !this.config.cancelReason) {
        this.sendAnnounce('Debugging disconnected. AutoHotkey script is continued.');
      }
      else if (this.config.request === 'attach' && this.ahkProcess) {
        this.sendAnnounce('Attaching stopped.');
      }
    }

    await this.session?.close();
    this.server?.close();
    this.isTerminateRequested = true;

    const jumpToError = await this.jumpToError();
    if (!jumpToError) {
      this.openFileOnExit();
    }

    this.sendResponse(response);
  }
  protected async launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): Promise<void> {
    this.traceLogger.enable = args.trace;
    this.traceLogger.log('launchRequest');
    this.config = args;

    try {
      this.ahkProcess = new AutoHotkeyLauncher(this.config).launch();
      this.ahkProcess.event
        .on('close', (exitCode?: number) => {
          if (this.isTerminateRequested) {
            return;
          }
          this.traceLogger.log('Autohotkey close');

          if (typeof exitCode === 'number') {
            this.exitCode = exitCode;
          }
          this.sendTerminateEvent();
        })
        .on('stdout', (message: string) => {
          const fixedData = this.fixPathOfRuntimeError(message);
          if (!this.session && !this.config.noDebug) {
            this.delayedWarningMessages.push(fixedData);
            return;
          }
          this.sendOutputEvent(fixedData);
        })
        .on('stderr', (message: string) => {
          this.errorMessage = this.fixPathOfRuntimeError(message);
          this.sendOutputEvent(this.errorMessage, 'stderr');
        })
        .on('outputdebug', (message: string) => {
          this.errorMessage = this.fixPathOfRuntimeError(message);
          this.sendOutputDebug(this.errorMessage);
        });
      this.sendAnnounce(`${this.ahkProcess.command}`);
      await this.createServer(args);
    }
    catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'User will never see this message.';
      this.sendErrorResponse(response, { id: this.errorCounter++, format: errorMessage });
      this.sendTerminateEvent();
      return;
    }

    this.sendResponse(response);
  }
  protected async attachRequest(response: DebugProtocol.AttachResponse, args: LaunchRequestArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.enable = args.trace;
    this.traceLogger.log('attachRequest');
    this.config = args;

    if (this.config.cancelReason) {
      this.sendAnnounce(`${this.config.cancelReason}`, 'stderr');
      this.sendTerminateEvent();
      this.sendResponse(response);
      return;
    }

    const ahkProcess = new AutoHotkeyLauncher(this.config).attach();
    if (!ahkProcess) {
      this.sendAnnounce(`Failed to attach "${this.config.program}".`, 'stderr');
      this.sendTerminateEvent();
      this.sendResponse(response);
      return;
    }

    this.sendAnnounce(`Attached to "${this.config.program}".`);
    this.ahkProcess = ahkProcess;
    this.ahkProcess.event
      .on('close', (exitCode?: number) => {
        if (this.isTerminateRequested) {
          return;
        }

        if (typeof exitCode === 'number') {
          this.sendAnnounce(`AutoHotkey closed for the following exit code: ${exitCode}`, exitCode === 0 ? 'console' : 'stderr', exitCode === 0 ? 'detail' : 'error');
        }
        this.sendTerminateEvent();
      })
      .on('stdout', (message: string) => {
        const fixedData = this.fixPathOfRuntimeError(message);
        this.sendOutputEvent(fixedData, 'stdout');
      })
      .on('stderr', (message: string) => {
        const fixedData = this.fixPathOfRuntimeError(String(message));
        this.errorMessage = fixedData;
        this.sendOutputEvent(fixedData, 'stderr');
      });

    await this.createServer(args);
    this.sendResponse(response);
  }
  protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): Promise<void> {
    return asyncLock.acquire('setBreakPointsRequest', async() => {
      this.traceLogger.log('setBreakPointsRequest');
      if (this.isClosedSession) {
        this.sendResponse(response);
        return;
      }

      const filePath = args.source.path ?? '';
      const fileUri = toFileUri(filePath);

      const removedBreakpoints = await this.breakpointManager!.unregisterBreakpointsInFile(fileUri);

      const vscodeBreakpoints: DebugProtocol.Breakpoint[] = [];
      for await (const requestedBreakpoint of args.breakpoints ?? []) {
        try {
          const { condition, hitCondition, line, column = 1 } = requestedBreakpoint;
          const logMessage = requestedBreakpoint.logMessage ? `${requestedBreakpoint.logMessage}\n` : '';
          const advancedData = {
            condition,
            hitCondition,
            logMessage,
            unverifiedLine: line,
            unverifiedColumn: column,
          } as BreakpointAdvancedData;

          const registeredBreakpoint = await this.breakpointManager!.registerBreakpoint(fileUri, line, advancedData);

          // Restore hitCount
          const removedBreakpoint = removedBreakpoints.find((breakpoint) => registeredBreakpoint.unverifiedLine === breakpoint.unverifiedLine && registeredBreakpoint.unverifiedColumn === breakpoint.unverifiedColumn);
          if (removedBreakpoint) {
            registeredBreakpoint.hitCount = removedBreakpoint.hitCount;
          }

          vscodeBreakpoints.push({
            id: registeredBreakpoint.id,
            line: registeredBreakpoint.line,
            verified: true,
          });
        }
        catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'User will never see this message.';
          vscodeBreakpoints.push({
            verified: false,
            message: errorMessage,
          });
        }
      }

      response.body = { breakpoints: vscodeBreakpoints };
      this.sendResponse(response);
    });
  }
  protected async setExceptionBreakPointsRequest(response: DebugProtocol.SetExceptionBreakpointsResponse, args: DebugProtocol.SetExceptionBreakpointsArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    this.exceptionArgs = args;

    const exceptionEnabled = (this.exceptionArgs.filterOptions ?? []).some((filter) => filter.filterId.endsWith('exceptions'));
    await this.session!.sendExceptionBreakpointCommand(exceptionEnabled);

    if (this.hiddenBreakpointsWithUI) {
      this.unregisterHiddenBreakpointsWithUI();

      for await (const filterOption of this.exceptionArgs.filterOptions ?? []) {
        const hiddenBreakpointWithUI = this.hiddenBreakpointsWithUI.find((breakpoint) => filterOption.filterId === breakpoint.id);
        if (hiddenBreakpointWithUI) {
          await this.registerHiddenBreakpointsWithUI(hiddenBreakpointWithUI);
        }
      }
    }
    this.sendResponse(response);
  }
  protected async exceptionInfoRequest(response: DebugProtocol.ExceptionInfoResponse, args: DebugProtocol.ExceptionInfoArguments, request?: DebugProtocol.Request): Promise<void> {
    const exception = (await this.evaluator.eval('GetVar("<exception>")')) as dbgp.ObjectProperty | undefined;
    if (typeof exception === 'undefined') {
      this.sendResponse(response);
      return;
    }

    await this.trySuppressAutoHotkeyDialog();
    const classNameProperty = exception.children.find((child) => equalsIgnoreCase(child.name, '__CLASS'));
    const exceptionId = classNameProperty instanceof dbgp.PrimitiveProperty ? classNameProperty.value : '<exception>';
    const messageProperty = exception.children.find((child) => equalsIgnoreCase(child.name, 'Message'));

    response.body = {
      exceptionId: messageProperty instanceof dbgp.PrimitiveProperty && messageProperty.value !== ''
        ? `${exceptionId}: ${messageProperty.value}`
        : exceptionId,
      breakMode: 'always',
      description: this.currentStackFrames!.map((stackFrame, index) => {
        const message = `${stackFrame.name} (${stackFrame.source.path}:${stackFrame.line})`;
        if (index === 0) {
          return message;
        }
        return `  at ${message}`;
      }).join('\n'),
    };
    this.sendResponse(response);
  }
  protected async setFunctionBreakPointsRequest(response: DebugProtocol.SetFunctionBreakpointsResponse, args: DebugProtocol.SetFunctionBreakpointsArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    this.initSymbols();

    for await (const breakpoint of args.breakpoints) {
      const callableSymbols = this.findCallableSymbols(breakpoint.name);
      for await (const symbol of callableSymbols) {
        try {
          const existsFunctionBreakpoint = this.registeredFunctionBreakpoints.find((breakpoint) => {
            return breakpoint.group === 'function-breakpoint'
              && breakpoint.filePath === symbol.location.sourceFile
              && breakpoint.unverifiedLine === sym.getLine(symbol, symbol.location.startIndex);
          });
          if (existsFunctionBreakpoint) {
            existsFunctionBreakpoint.condition = breakpoint.condition ?? '';
            existsFunctionBreakpoint.hitCondition = breakpoint.hitCondition ?? '';
            continue;
          }

          const fileUri = toFileUri(symbol.location.sourceFile);
          const line = sym.getLine(symbol, symbol.location.startIndex);
          const advancedData = {
            group: 'function-breakpoint',
            condition: breakpoint.condition,
            hitCondition: breakpoint.hitCondition,
            hidden: true,
            shouldBreak: false,
            unverifiedLine: line,
            unverifiedColumn: 1,
          } as BreakpointAdvancedData;

          const registeredBreakpoint = await this.breakpointManager!.registerBreakpoint(fileUri, line, advancedData);
          this.registeredFunctionBreakpoints.push(registeredBreakpoint);
        }
        catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'User will never see this message.';
          console.log(errorMessage);
        }
      }
    }
    this.sendResponse(response);
  }
  protected async configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('configurationDoneRequest');
    this.sendResponse(response);
    if (this.isClosedSession) {
      return;
    }

    await this.session!.sendFeatureSetCommand('max_children', this.config.maxChildren);
    await this.registerDebugDirective();
    await this.registerHiddenBreakpoints();

    const result = this.config.stopOnEntry
      ? await this.session!.sendContinuationCommand('step_into')
      : await this.session!.sendContinuationCommand('run');
    this.checkContinuationStatus(result);
  }
  protected async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('continueRequest');
    this.sendResponse(response);
    if (this.isClosedSession) {
      return;
    }

    this.currentMetaVariableMap.clear();
    this.pauseRequested = false;
    this.isPaused = false;

    this.clearPerfTipsDecorations();
    const result = await this.session!.sendContinuationCommand('run');
    this.checkContinuationStatus(result);
  }
  protected async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('nextRequest');
    this.sendResponse(response);
    if (this.isClosedSession) {
      return;
    }

    this.currentMetaVariableMap.clear();
    this.pauseRequested = false;
    this.isPaused = false;

    this.clearPerfTipsDecorations();
    const result = await this.session!.sendContinuationCommand('step_over');
    this.checkContinuationStatus(result);
  }
  protected async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('stepInRequest');
    this.sendResponse(response);
    if (this.isClosedSession) {
      return;
    }

    this.currentMetaVariableMap.clear();
    this.pauseRequested = false;
    this.isPaused = false;

    this.clearPerfTipsDecorations();
    const result = await this.session!.sendContinuationCommand('step_into');
    this.checkContinuationStatus(result);
  }
  protected async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('stepOutRequest');
    this.sendResponse(response);
    if (this.isClosedSession) {
      return;
    }

    let runToEndOfFunctionBreakpoint: Breakpoint | undefined;
    if (enableRunToEndOfFunction) {
      this.initSymbols();

      const filePath = this.currentStackFrames?.[0].source.path;
      const funcName = this.currentStackFrames?.[0].name;
      if (filePath && funcName?.includes('()')) {
        const symbol = this.callableSymbols?.find((symbol) => funcName.match(new RegExp(`^${symbol.fullname}()$`, 'iu')));
        if (symbol?.location.endIndex) {
          const fileUri = toFileUri(filePath);
          const line = sym.getLine(symbol, symbol.location.endIndex);
          runToEndOfFunctionBreakpoint = await this.breakpointManager!.registerBreakpoint(fileUri, line, { group: 'runToEndOfFunction' });
        }
      }
    }

    this.currentMetaVariableMap.clear();
    this.pauseRequested = false;
    this.isPaused = false;

    this.clearPerfTipsDecorations();
    const result = await this.session!.sendContinuationCommand('step_out');
    if (runToEndOfFunctionBreakpoint) {
      await this.breakpointManager!.unregisterBreakpoint(runToEndOfFunctionBreakpoint);
      setEnableRunToEndOfFunction(false);
    }
    this.checkContinuationStatus(result);
  }
  protected async pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('pauseRequest');
    this.sendResponse(response);
    if (this.isClosedSession) {
      return;
    }

    this.pauseRequested = false;
    this.isPaused = false;

    if (this.autoExecuting) {
      this.pauseRequested = true;

      // Force pause
      setTimeout(() => {
        if (!this.isPaused) {
          if (this.isClosedSession) {
            return;
          }

          this.pauseRequested = false;
          this.session!.sendContinuationCommand('break').then((result) => {
            this.checkContinuationStatus(result);
          });
        }
      }, 100);
      return;
    }

    this.currentMetaVariableMap.clear();
    const result = await this.session!.sendContinuationCommand('break');
    this.checkContinuationStatus(result);
  }
  protected threadsRequest(response: DebugProtocol.ThreadsResponse, request?: DebugProtocol.Request): void {
    this.traceLogger.log('threadsRequest');
    if (this.isClosedSession) {
      this.sendResponse(response);
      return;
    }

    response.body = { threads: [ new Thread(this.session!.id, 'Thread 1') ] };
    this.sendResponse(response);
  }
  protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('stackTraceRequest');
    if (this.isClosedSession) {
      this.sendResponse(response);
      return;
    }

    const startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
    const maxLevels = typeof args.levels === 'number' ? args.levels : 1000;
    const endFrame = startFrame + maxLevels;

    if (!this.currentStackFrames) {
      this.currentStackFrames = await this.variableManager!.createStackFrames();
    }
    const allStackFrames = this.currentStackFrames;
    const stackFrames = allStackFrames.slice(startFrame, endFrame);
    response.body = {
      totalFrames: allStackFrames.length,
      stackFrames,
    };
    this.sendResponse(response);
  }
  protected async scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('scopesRequest');
    if (this.isClosedSession) {
      this.sendResponse(response);
      return;
    }

    const categories = await this.variableManager!.createCategories(args.frameId);
    const metaVaribalesByFrameId = this.metaVaribalesByFrameId.get(args.frameId);
    this.currentMetaVariableMap.clear();
    if (metaVaribalesByFrameId) {
      this.currentMetaVariableMap.setAll(metaVaribalesByFrameId);
    }
    response.body = {
      scopes: categories.map((scope) => ({
        name: scope.name,
        expensive: scope.expensive,
        variablesReference: scope.variablesReference,
      })),
    };

    this.sendResponse(response);
  }
  protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('variablesRequest');

    if (this.isClosedSession) {
      this.sendResponse(response);
      return;
    }

    const logged = this.logObjectsMap.get(args.variablesReference);
    if (logged) {
      if (logged instanceof Scope || logged instanceof Category || logged instanceof Categories) {
        const scope = logged;
        response.body = {
          variables: [
            {
              name: scope.name,
              variablesReference: scope.variablesReference,
              value: scope.name,
              type: '',
            },
          ],
        };
      }
      else if (logged instanceof Variable) {
        const variable = logged;
        response.body = {
          variables: [
            {
              name: variable.name,
              variablesReference: variable.variablesReference,
              value: `${variable.name}: ${variable.value}`,
              type: variable.type,
              indexedVariables: variable.indexedVariables,
              namedVariables: variable.namedVariables,
            },
          ],
        };
      }
      else if (logged instanceof MetaVariable) {
        const metaVarible = logged;
        response.body = {
          variables: [
            {
              name: metaVarible.name,
              value: metaVarible.name,
              variablesReference: metaVarible.variablesReference,
              indexedVariables: metaVarible.indexedVariables,
              namedVariables: metaVarible.namedVariables,
            },
          ],
        };
      }
      this.sendResponse(response);
      return;
    }

    const categories = this.variableManager!.getCategories(args.variablesReference);
    if (categories) {
      response.body = {
        variables: categories.map((category) => ({
          name: category.name,
          variablesReference: category.variablesReference,
          value: category.name,
        })),
      };
      this.sendResponse(response);
      return;
    }

    const metaVariable = this.variableManager!.getMetaVariable(args.variablesReference);
    if (metaVariable && !(metaVariable.rawValue instanceof Variable)) {
      response.body = {
        variables: (await metaVariable.createChildren()).map((child) => ({
          name: child.name,
          variablesReference: child.variablesReference,
          value: child.value,
          indexedVariables: child.indexedVariables,
          namedVariables: child.namedVariables,
        })),
      };
      this.sendResponse(response);
      return;
    }

    const variables = await (metaVariable?.rawValue as Variable | undefined)?.createMembers(args)
      ?? await this.variableManager!.getCategory(args.variablesReference)?.createChildren()
      ?? await this.variableManager!.createVariables(args);
    if (variables) {
      response.body = {
        variables: variables.map((variable) => ({
          name: variable.name,
          variablesReference: variable.variablesReference,
          value: variable.value,
          type: variable.type,
          indexedVariables: variable.indexedVariables,
          namedVariables: variable.namedVariables,
          evaluateName: variable.fullName,
          __vscodeVariableMenuContext: variable.__vscodeVariableMenuContext,
        })),
      };
    }
    this.sendResponse(response);
  }
  protected async setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('setVariableRequest');

    if (!this.currentStackFrames || this.currentStackFrames.length === 0) {
      throw Error('Could not retrieve stack frame.');
    }

    let fullName = args.name;
    try {
      let context: dbgp.Context;
      const objectVariable = this.variableManager!.getObjectVariable(args.variablesReference);
      if (objectVariable) {
        const name = args.name.startsWith('[') ? args.name : `.${args.name}`;
        fullName = `${objectVariable.fullName}${name}`;
        context = objectVariable.context;
      }
      else {
        context = this.variableManager!.getCategory(args.variablesReference)!.context;
      }

      if (args.value === '') {
        throw Error('Empty value cannot be set.');
      }

      const result = await this.setVariable(fullName, args.value, context);
      if (typeof result === 'undefined') {
        response.body = {
          value: 'Not initialized',
          type: 'undefined',
        };
      }
      else {
        response.body = result;
      }
      this.sendResponse(response);
    }
    catch (e: unknown) {
      if (e instanceof dbgp.DbgpCriticalError) {
        const message = `A critical error occurred evaluating the value to be written to \`${args.value}\` in watch expression.`;
        this.criticalError(message);
      }
      else if (e instanceof ParseError) {
        const message = `Failed to parse the value to be written to \`${fullName}\`.`;
        this.sendErrorResponse(response, {
          id: this.errorCounter++,
          format: message,
        } as DebugProtocol.Message);
      }
      else if (e instanceof Error) {
        const title = `Failed to write variable \`${fullName}\``;
        this.sendErrorResponse(response, {
          id: this.errorCounter++,
          format: `${title}. ${e.message}`,
        } as DebugProtocol.Message);
      }
    }
  }
  protected async evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments, request?: DebugProtocol.Request): Promise<void> {
    return asyncLock.acquire('evaluateRequest', async() => {
      this.traceLogger.log('evaluateRequest');

      if (this.isClosedSession) {
        this.sendResponse(response);
        return;
      }
      else if (args.context === 'variables' || args.context === 'clipboard') {
        this.sendResponse(response);
        return;
      }

      try {
        if (!args.frameId) {
          throw Error('Error: Cannot evaluate code without a session');
        }

        const stackFrame = this.variableManager!.getStackFrame(args.frameId);
        if (!stackFrame) {
          throw Error('Error: Could not get stack frame');
        }

        const value = await this.evaluator.eval(args.expression, stackFrame.dbgpStackFrame);
        if (typeof value === 'undefined') {
          if (args.context === 'hover') {
            this.sendResponse(response);
            return;
          }

          response.body = {
            result: 'Not initialized',
            type: 'undefined',
            variablesReference: -1,
          };
          this.sendResponse(response);
          return;
        }

        if (value instanceof dbgp.ObjectProperty) {
          const variable = new Variable(this.session!, value);
          response.body = {
            result: formatProperty(value, this.session?.ahkVersion),
            type: value.type,
            variablesReference: variable.variablesReference,
            indexedVariables: variable.indexedVariables,
            namedVariables: variable.namedVariables,
          };

          this.sendResponse(response);
          return;
        }

        if (value instanceof MetaVariable) {
          if (value.hasChildren) {
            await value.loadChildren(1);

            response.body = {
              result: value.name,
              type: 'metavariable',
              variablesReference: value.variablesReference,
            };
            this.sendResponse(response);
            return;
          }

          response.body = {
            result: value.value,
            type: 'metavariable',
            variablesReference: 0,
          };
          this.sendResponse(response);
          return;
        }

        response.body = {
          result: typeof value === 'string' ? `"${value}"` : String(value),
          type: toType(this.session!.ahkVersion, value),
          variablesReference: 0,
        };
        this.sendResponse(response);
      }
      catch (e: unknown) {
        if (e instanceof dbgp.DbgpCriticalError) {
          this.criticalError(e.message);
        }
        else if (e instanceof Error) {
          this.sendErrorResponse(response, {
            id: this.errorCounter++,
            format: e.message,
          });
        }
      }
    });
  }
  protected async setExpressionRequest(response: DebugProtocol.SetExpressionResponse, args: DebugProtocol.SetExpressionArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    return asyncLock.acquire('evaluateRequest', async() => {
      if (!args.frameId) {
        return;
      }

      const stackFrame = this.variableManager!.getStackFrame(args.frameId);
      if (!stackFrame) {
        throw Error('Error: Could not get stack frame');
      }

      try {
        const result = await this.setVariable(args.expression, args.value, stackFrame.dbgpStackFrame);
        response.body = result;
        this.sendResponse(response);
      }
      catch (e: unknown) {
        if (e instanceof dbgp.DbgpCriticalError) {
          const message = `A critical error occurred evaluating the value to be written to \`${args.expression}\` in watch expression.`;
          this.criticalError(message);
        }
        else if (e instanceof ParseError) {
          const message = `Failed to parse the value to be written to \`${args.expression}\` in watch expression.`;
          vscode.window.showErrorMessage(message);
        }
        else if (e instanceof Error) {
          const message = `Failed to write \`${args.expression}\` in watch expression. ${e.message}`;
          vscode.window.showErrorMessage(message);
        }
      }
    });
  }
  protected sourceRequest(response: DebugProtocol.SourceResponse, args: DebugProtocol.SourceArguments, request?: DebugProtocol.Request): void {
    this.traceLogger.log('sourceRequest');
    this.sendResponse(response);
  }
  protected async completionsRequest(response: DebugProtocol.CompletionsResponse, args: DebugProtocol.CompletionsArguments, request?: DebugProtocol.Request | undefined): Promise<void> {
    const createType = (property: dbgp.Property): DebugProtocol.CompletionItemType => {
      if (property instanceof dbgp.ObjectProperty) {
        if (equalsIgnoreCase(property.name, '__NEW')) {
          return 'constructor';
        }
        if (property.className === 'Func') {
          return property.fullName.includes('.') ? 'method' : 'function';
        }
        if (property.className === 'Class') {
          return 'class';
        }
        if (property.className === 'Property') {
          return 'property';
        }
      }

      return property.fullName.includes('.') ? 'field' : 'variable';
    };
    const createFixers = (ahkVersion: AhkVersion, label: string, snippet: string, position: Pick<DebugProtocol.CompletionsArguments, 'line' | 'column'>, triggerCharacter: string): Partial<DebugProtocol.CompletionItem> => {
      const column_0base = position.column - 1;
      const fixers: Partial<DebugProtocol.CompletionItem> = {};
      if ([ '[', '["', `['` ].includes(triggerCharacter)) {
        if (2 <= ahkVersion.mejor && !label.startsWith('[')) {
          return fixers;
        }

        const quote = triggerCharacter === '[' ? '"' : triggerCharacter.slice(1);
        const afterText = args.text.slice(column_0base);
        const afterText_masked = maskQuotes(ahkVersion, afterText);
        const pairIndex_close = searchPair(afterText_masked, '[', ']', 1);

        const openText = triggerCharacter === '[' ? '"' : '';
        let closeText = triggerCharacter === '[' ? '"]' : `${triggerCharacter.slice(1)}]`;
        if (pairIndex_close !== -1) {
          closeText = '';

          const closeQuote = afterText.charAt(pairIndex_close - 1);
          if (!(closeQuote === '"' || (2 <= ahkVersion.mejor && closeQuote === `'`))) {
            closeText = quote;
          }
        }

        const label_dotNotation = toDotNotation(ahkVersion, label);
        fixers.text = `${openText}${label_dotNotation}${closeText}`;
        fixers.label = `[${quote}${label_dotNotation}${quote}]`;
        fixers.start = triggerCharacter.length;
        return fixers;
      }
      return fixers;
    };

    const targets = (await this.intellisense!.getSuggestion(args.text.slice(0, args.column - 1), async(property, snippet, triggerCharacter): Promise<DebugProtocol.CompletionItem | undefined> => {
      // If the trigger is a dot and the completion outputs bracket notation, the dot must be removed. However, the completionsRequest cannot overwrite characters that have already been entered, so they should not be displayed in the completion in such cases
      if (triggerCharacter === '.' && property.name.startsWith('[')) {
        return undefined;
      }

      const label = createCompletionLabel(property.name);
      const completionItem: DebugProtocol.CompletionItem = {
        label,
        detail: await createCompletionDetail(this.session!, property),
        type: createType(property),
        sortText: createCompletionSortText(property),
        ...createFixers(this.session!.ahkVersion, label, snippet, args, triggerCharacter),
      };
      completionItem.sortText = createCompletionSortText(property.fullName, String(completionItem.label));
      return completionItem;
    })).filter((item) => typeof item !== 'undefined') as DebugProtocol.CompletionItem[];

    response.body = { targets };
    this.sendResponse(response);
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  protected async loadedSourcesRequest(response: DebugProtocol.LoadedSourcesResponse, args: DebugProtocol.LoadedSourcesArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('loadedSourcesRequest');

    if (!this.config.useLoadedScripts) {
      this.sendResponse(response);
      return;
    }
    const loadedScriptPathList = await this.getAllLoadedSourcePath();

    const sources: DebugProtocol.Source[] = [];
    await Promise.all(loadedScriptPathList.map(async(filePath): Promise<void> => {
      return new Promise((resolve) => {
        stat(filePath, (err, stats) => {
          if (err) {
            // sources.push({ name: 'Failed to read' });
            resolve();
            return;
          }

          if (stats.isFile()) {
            sources.push({ name: path.basename(filePath), path: filePath });
          }
          resolve();
        });
      });
    }));

    response.body = { sources };
    this.sendResponse(response);
  }
  private initSymbols(): void {
    if (this.symbols) {
      return;
    }

    this.symbols = this.symbolFinder!.find(this.config.program).filter((symbol) => 'name' in symbol) as sym.NamedNode[];
    this.callableSymbols = this.symbols.filter((node) => [ 'function', 'getter', 'setter' ].includes(node.type));
  }
  private async getAllLoadedSourcePath(): Promise<string[]> {
    if (0 < this.loadedSources.length) {
      return this.loadedSources;
    }

    const extractor = new IncludePathExtractor(this.session!.ahkVersion);
    this.loadedSources.push(...[ this.config.program, ...extractor.extract(this.config.program, { A_AhkPath: this.config.runtime }) ]);
    if (this.config.useLoadedScripts !== false && this.config.useLoadedScripts.scanImplicitLibrary) {
      const implicitFunctionPathExtractor = new ImplicitLibraryPathExtractor(this.session!.ahkVersion);
      this.loadedSources.push(...implicitFunctionPathExtractor.extract(this.loadedSources, { A_AhkPath: this.config.runtime }));
    }

    return Promise.resolve(this.loadedSources);
  }
  private async trySuppressAutoHotkeyDialog(): Promise<void> {
    if (!this.session) {
      return;
    }

    try {
      await this.session.sendExceptionSetCommand();
    }
    catch (e: unknown) {
    }
  }
  private async clearDebugConsole(): Promise<void> {
    // There is a lag between the execution of a command and the console being cleared. This lag can be eliminated by executing the command multiple times.
    await vscode.commands.executeCommand('workbench.debug.panel.action.clearReplAction');
    await vscode.commands.executeCommand('workbench.debug.panel.action.clearReplAction');
    await vscode.commands.executeCommand('workbench.debug.panel.action.clearReplAction');
  }
  private async registerDebugDirective(): Promise<void> {
    if (!this.session) {
      return;
    }
    if (!this.config.useDebugDirective) {
      return;
    }
    const { useBreakpointDirective, useOutputDirective, useClearConsoleDirective } = this.config.useDebugDirective;

    const parser = new DebugDirectiveParser(this.session.ahkVersion);
    const filePathListChunked = chunk(await this.getAllLoadedSourcePath(), 50); // https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/203
    for await (const filePathList of filePathListChunked) {
      await Promise.all(filePathList.map(async(filePath) => {
        const document = await vscode.workspace.openTextDocument(filePath);
        const fileUri = toFileUri(filePath);

        await Promise.all(range(document.lineCount).map(async(line_0base) => {
          const textLine = document.lineAt(line_0base);
          const parsed = parser.parse(textLine.text);
          if (!parsed) {
            return;
          }

          const { name: directiveName, condition, hitCondition, message: logMessage } = parsed;
          try {
            const line = line_0base + 1;
            if (useBreakpointDirective && directiveName === 'breakpoint') {
              const advancedData = {
                condition,
                hitCondition,
                logMessage,
                shouldBreak: true,
                hidden: true,
              } as BreakpointAdvancedData;
              await this.breakpointManager!.registerBreakpoint(fileUri, line, advancedData);
            }
            else if (useOutputDirective && directiveName === 'output') {
              const newCondition = condition;
              const advancedData = {
                condition: newCondition,
                hitCondition,
                logMessage,
                hidden: true,
              } as BreakpointAdvancedData;
              await this.breakpointManager!.registerBreakpoint(fileUri, line, advancedData);
            }
            else if (useClearConsoleDirective && directiveName === 'clearconsole') {
              const advancedData = {
                condition,
                hitCondition,
                logMessage,
                hidden: true,
                action: this.createBreakpointAction('ClearConsole'),
              } as BreakpointAdvancedData;
              await this.breakpointManager!.registerBreakpoint(fileUri, line, advancedData);
            }
          }
          catch (e: unknown) {
            if (e instanceof Error) {
              console.log(e.message);
            }
          }
        }));
      }));
    }
  }
  private createBreakpointAction(action?: HiddenBreakpointActionName): BreakpointAction | undefined {
    if (typeof action === 'undefined') {
      return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (action === 'ClearConsole') {
      return async() => {
        await this.clearDebugConsole();
      };
    }
    return undefined;
  }
  private async matchLineNumbers(filePathOrNode: string | sym.NamedNode, lineMatcher: LineMatcher): Promise<LineMatchResult[]> {
    if (typeof lineMatcher === 'number') {
      if (lineMatcher === 0) {
        return [ { line: 1 } ];
      }
      if (0 < lineMatcher) {
        if (typeof filePathOrNode === 'string') {
          return [ { line: lineMatcher } ];
        }

        const node = filePathOrNode;
        return [ { line: sym.getLine(node, node.location.startIndex) + (lineMatcher - 1) } ];
      }

      if (typeof filePathOrNode === 'string') {
        const source = await readFileCache(filePathOrNode);
        const lineCount = source.split(/\r\n|\n/u).length;
        return [ { line: lineCount - Math.abs(lineMatcher + 1) } ];
      }

      const node = filePathOrNode;
      return [ { line: sym.getLine(node, node.location.endIndex) - Math.abs(lineMatcher + 1) } ];
    }
    else if (Array.isArray(lineMatcher)) {
      return (await Promise.all(lineMatcher.map(async(line) => this.matchLineNumbers(filePathOrNode, line)))).flat();
    }

    if ('pattern' in lineMatcher) {
      return this.regexMatchLines(filePathOrNode, lineMatcher);
    }
    return [];
  }
  private async regexMatchLines(filePathOrNode: string | sym.NamedNode, matcher: RegExLineMatcher): Promise<LineMatchResult[]> {
    const source = typeof filePathOrNode === 'string'
      ? await readFileCache(filePathOrNode)
      : sym.getText(filePathOrNode);
    const startLine = typeof filePathOrNode === 'string' ? 0 : sym.getLine(filePathOrNode, filePathOrNode.location.startIndex);

    const lines = source.split(/\r\n|\n/u);
    const regexp = new RegExp(matcher.pattern, matcher.ignoreCase ? 'ui' : 'u');
    const offset = matcher.offset ? matcher.offset : 0;
    const matchedLines = lines
      .flatMap((line, i): LineMatchResult[] => {
        const match = line.match(regexp);
        if (!match) {
          return [];
        }
        return [ { line: (startLine + (i + 1)) + offset, match } ];
      });
    return this.selectLineMatchResults(matchedLines, matcher.select);
  }
  private selectLineMatchResults(results: LineMatchResult[], selector: MatchSelector): LineMatchResult[] {
    return results.filter((result, i) => {
      if (typeof selector === 'undefined') {
        return true;
      }
      if (selector === 'first' && i === 0) {
        return true;
      }
      if (selector === 'last' && (results.length - 1) === i) {
        return true;
      }
      if (selector === 'all') {
        return true;
      }

      const i_1base = i + 1;
      if (typeof selector === 'number' && selector === i_1base) {
        return true;
      }
      else if (Array.isArray(selector) && selector.includes(i_1base)) {
        return true;
      }
      return false;
    });
  }
  private findCallableSymbols(matcher: string): sym.NamedNode[] {
    this.initSymbols();

    const regex = /(\[\]|\(\))$/u;
    const target = matcher.replace(regex, '');
    const targetKind = matcher.match(regex)?.[0];

    const isMatch = wildcard(target, { separator: '.', flags: 'i' });
    return (this.callableSymbols ?? []).filter((symbol, i, symbols) => {
      const matchResult = isMatch(symbol.fullname);
      if (targetKind === '()') {
        return matchResult && symbol.type === 'function';
      }
      if (targetKind === '[]') {
        return matchResult && (symbol.type === 'property' || symbol.type === 'getter' || symbol.type === 'setter');
      }
      if (!matchResult && symbol.type === 'getter') {
        const isMatch = wildcard(`${target}.get`, { separator: '.', flags: 'i' });
        return symbols.some((symbol) => {
          return isMatch(symbol.fullname);
        });
      }
      if (!matchResult && symbol.type === 'setter') {
        const isMatch = wildcard(`${target}.set`, { separator: '.', flags: 'i' });
        return symbols.some((symbol) => {
          return isMatch(symbol.fullname);
        });
      }
      return matchResult;
    });
  }
  private async registerHiddenBreakpoint(breakpointData: HiddenBreakpoint, groupName: string): Promise<void> {
    const createAdditionalMetaVariables = (lineMatchResult: LineMatchResult): CaseInsensitiveMap<string, string> | undefined => {
      if (!lineMatchResult.match) {
        return undefined;
      }

      const additionalMetaVariables = new CaseInsensitiveMap<string, string>();
      lineMatchResult.match.forEach((match, i) => {
        additionalMetaVariables.set(`$${i}`, match);
      });
      Object.entries(lineMatchResult.match.groups ?? []).forEach(([ key, value ], i) => {
        additionalMetaVariables.set(`$${key}`, value);
      });
      return additionalMetaVariables;
    };

    const shouldBreak = typeof breakpointData.break === 'undefined'
      ? !(breakpointData.log ?? breakpointData.action)
      : breakpointData.break;
    const logMessage = breakpointData.log ? `${breakpointData.log}\n` : undefined;
    const action = this.createBreakpointAction(breakpointData.action);

    const targets = Array.isArray(breakpointData.target) ? breakpointData.target : [ breakpointData.target ];
    for await (const target of targets) {
      const fileMode = target.includes('/') || target.includes('\\');
      if (fileMode) {
        const loadedSources = await this.getAllLoadedSourcePath();
        const replaceSlash = (filePath: string): string => path.resolve(filePath).replaceAll('\\', '/');

        const isMatch = wildcard(targets.map((target) => replaceSlash(target)), { flags: 'i' });
        const targetFilePathList = loadedSources.filter((source) => {
          return isMatch(replaceSlash(source));
        });

        for await (const filePath of targetFilePathList) {
          const lineMatchResults = await this.matchLineNumbers(filePath, breakpointData.line);

          for await (const lineMatchResult of lineMatchResults) {
            await this.breakpointManager!.registerBreakpoint(toFileUri(filePath), lineMatchResult.line, {
              condition: breakpointData.condition,
              hitCondition: breakpointData.hitCondition,
              shouldBreak,
              hidden: true,
              logMessage,
              additionalMetaVariables: createAdditionalMetaVariables(lineMatchResult),
              group: groupName,
              action,
            });
          }
        }
        return;
      }

      const callableSymbols = this.findCallableSymbols(target);
      for await (const callableSymbol of callableSymbols) {
        const lineMatchResults = await this.matchLineNumbers(callableSymbol, breakpointData.line);

        for await (const lineMatchResult of lineMatchResults) {
          await this.breakpointManager!.registerBreakpoint(toFileUri(callableSymbol.location.sourceFile), lineMatchResult.line, {
            condition: breakpointData.condition,
            hitCondition: breakpointData.hitCondition,
            shouldBreak,
            hidden: true,
            logMessage,
            additionalMetaVariables: createAdditionalMetaVariables(lineMatchResult),
            group: groupName,
            action,
          });
        }
      }
    }
  }
  private async registerHiddenBreakpoints(): Promise<void> {
    if (!this.hiddenBreakpoints) {
      return;
    }

    for await (const breakpointData of this.hiddenBreakpoints) {
      await this.registerHiddenBreakpoint(breakpointData, 'hidden-breakpoint');
    }
  }
  private async registerHiddenBreakpointsWithUI(hiddenBreakpoint: HiddenBreakpointWithUI): Promise<void> {
    for await (const breakpoint of hiddenBreakpoint.breakpoints) {
      await this.registerHiddenBreakpoint(breakpoint, hiddenBreakpoint.id);
    }
  }
  private async unregisterHiddenBreakpointWithUI(hiddenBreakpoint: HiddenBreakpointWithUI): Promise<void> {
    return this.breakpointManager!.unregisterBreakpointGroup(hiddenBreakpoint.id);
  }
  private async unregisterHiddenBreakpointsWithUI(): Promise<void> {
    if (!this.hiddenBreakpointsWithUI) {
      return;
    }

    for await (const hiddenBreakpointWithUI of this.hiddenBreakpointsWithUI) {
      await this.unregisterHiddenBreakpointWithUI(hiddenBreakpointWithUI);
    }
  }
  private fixPathOfRuntimeError(errorMessage: string): string {
    if (-1 < errorMessage.search(/--->\t\d+:/gmu)) {
      const line = parseInt(errorMessage.match(/--->\t(?<line>\d+):/u)!.groups!.line, 10);
      let fixed = errorMessage;
      if (-1 < errorMessage.search(/^(Critical\s)?Error:\s{2}/gmu)) {
        fixed = errorMessage.replace(/^((Critical\s)?Error:\s{2})/gmu, `${this.config.program}:${line} : ==> `);
      }
      else if (-1 < errorMessage.search(/^Error in #include file /u)) {
        fixed = errorMessage.replace(/Error in #include file "(.+)":\n\s*(.+)/gmu, `$1:${line} : ==> $2`);
      }

      fixed = fixed.replace(/\n(Specifically:)/u, '     $1');
      fixed = fixed.substring(0, fixed.indexOf('Line#'));
      return `${fixed.replace(/\s+$/u, '')}\n`;
    }
    return errorMessage.replace(/^(.+)\s\((\d+)\)\s:/gmu, `$1:$2 :`);
  }
  private async findMatchedBreakpoint(lineBreakpoints?: LineBreakpoints): Promise<Breakpoint | undefined> {
    if (!lineBreakpoints) {
      return undefined;
    }

    for await (const breakpoint of lineBreakpoints) {
      if (!breakpoint.shouldBreak) {
        continue;
      }
      if (breakpoint.hasCondition) {
        if (await this.evaluateCondition(breakpoint)) {
          return breakpoint;
        }
        continue;
      }
      return breakpoint;
    }
    return undefined;
  }
  private async checkContinuationStatus(response: dbgp.ContinuationResponse): Promise<void> {
    this.traceLogger.log('checkContinuationStatus');
    if (this.isClosedSession) {
      return;
    }
    if (response.status !== 'break') {
      return;
    }
    if (this.isPaused) {
      return;
    }
    this.clearPerfTipsDecorations();

    // Prepare
    this.prevStackFrames = this.currentStackFrames;
    this.currentStackFrames = await this.variableManager!.createStackFrames();
    if (this.currentStackFrames.isIdleMode) {
      this.currentStackFrames = undefined;
      await this.sendStoppedEvent('pause');
      return;
    }
    const metaVariables = this.createMetaVariables(response);
    this.currentMetaVariableMap.clear();
    this.currentMetaVariableMap.setAll(metaVariables);
    const { source, line, name } = this.currentStackFrames[0];

    // Exception Breakpoint
    if (response.exitReason === 'error' || response.exitReason === 'exception') {
      const evaluateCondition = async(condition?: string): Promise<boolean> => {
        if (typeof condition === 'undefined' || condition === '') {
          return false;
        }
        const rawResult = await this.evaluator.eval(condition);
        return toJavaScriptBoolean(rawResult);
      };

      const caughtExceptions = this.exceptionArgs?.filterOptions?.find((filter) => filter.filterId === 'caught-exceptions');
      if (response.exitReason === 'exception' && caughtExceptions) {
        const matchCondition = (caughtExceptions.condition ?? '') === '' || await evaluateCondition(caughtExceptions.condition);
        if (matchCondition) {
          await this.sendStoppedEvent('exception');
          return;
        }
      }

      const uncaughtExceptions = this.exceptionArgs?.filterOptions?.find((filter) => filter.filterId === 'uncaught-exceptions');
      if (response.exitReason === 'error' && uncaughtExceptions) {
        await this.sendStoppedEvent('error');
        return;
      }

      if (response.commandName.includes('step')) {
        await this.processStepExecution(response.commandName as dbgp.StepCommandName);
        return;
      }

      this.autoExecuting = true;
      const result = await this.session!.sendRunCommand();
      await this.checkContinuationStatus(result);
      return;
    }

    const lineBreakpoints = this.breakpointManager!.getLineBreakpoints(source.path, line);
    let stopReason: StopReason = 'step';
    if (lineBreakpoints) {
      lineBreakpoints.incrementHitCount();
      if (0 < lineBreakpoints.length) {
        stopReason = lineBreakpoints[0].hidden
          ? 'hidden breakpoint'
          : 'breakpoint';
      }
    }
    else if (!this.pauseRequested) {
      const isSkipFile = this.config.skipFiles?.map((filePath) => URI.file(filePath).fsPath.toLowerCase()).includes(source.path.toLowerCase());
      if (isSkipFile) {
        const dbgpResponse = await this.session!.sendStepIntoCommand();
        this.autoExecuting = true;
        this.checkContinuationStatus(dbgpResponse);
        return;
      }
      const currentFuncName = name.includes('()') ? name.replace('()', '') : '';
      const isSkipFunction = 0 < matcher(currentFuncName, this.config.skipFunctions ?? []).length;
      if (isSkipFunction) {
        const dbgpResponse = await this.session!.sendStepIntoCommand();
        this.autoExecuting = true;
        this.checkContinuationStatus(dbgpResponse);
        return;
      }
    }

    // Pause
    if (response.commandName === 'break') {
      this.currentMetaVariableMap.set('elapsedTime_ns', -1);
      this.currentMetaVariableMap.set('elapsedTime_ms', -1);
      this.currentMetaVariableMap.set('elapsedTime_s', -1);
      await this.processActionpoint(lineBreakpoints);
      await this.sendStoppedEvent('pause');
      return;
    }

    // Paused on step
    if (response.commandName.includes('step')) {
      await this.processStepExecution(response.commandName as dbgp.StepCommandName, lineBreakpoints);
      return;
    }

    // Paused on breakpoint
    await this.processActionpoint(lineBreakpoints);
    const matchedBreakpoint = await this.findMatchedBreakpoint(lineBreakpoints);
    if (matchedBreakpoint) {
      this.currentMetaVariableMap.set('hitCount', String(matchedBreakpoint.hitCount));
      await this.sendStoppedEvent(stopReason);
      return;
    }

    // Interruptive pause
    if (this.pauseRequested) {
      this.currentMetaVariableMap.set('elapsedTime_ns', -1);
      this.currentMetaVariableMap.set('elapsedTime_ms', -1);
      this.currentMetaVariableMap.set('elapsedTime_s', -1);
      await this.session!.sendBreakCommand();
      await this.sendStoppedEvent('pause');
      return;
    }

    // Re-check in case an interruption has occurred
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.isPaused) {
      return;
    }

    // Auto execution
    this.autoExecuting = true;
    const result = await this.session!.sendRunCommand();
    await this.checkContinuationStatus(result);
  }
  private async processStepExecution(stepType: dbgp.StepCommandName, lineBreakpoints?: LineBreakpoints): Promise<void> {
    const thrownException = typeof lineBreakpoints === 'undefined';

    if (this.currentStackFrames?.isIdleMode) {
      throw Error(`This message shouldn't appear.`);
    }

    // Fix a bug that prevented AutoExec thread, Timer thread, from getting proper information when there was more than one call stack
    const prevStackFrames: StackFrames | undefined = this.prevStackFrames?.slice();
    const currentStackFrames = this.currentStackFrames!.slice();
    if (prevStackFrames && prevStackFrames.length === 1 && 1 < currentStackFrames.length) {
      currentStackFrames.pop();
      currentStackFrames.push(prevStackFrames[0]);
    }

    let stopReason: StopReason = 'step';
    const matchedBreakpoint = await this.findMatchedBreakpoint(lineBreakpoints);
    if (matchedBreakpoint) {
      this.currentMetaVariableMap.set('hitCount', String(matchedBreakpoint.hitCount));
      stopReason = matchedBreakpoint.hidden
        ? 'hidden breakpoint'
        : 'breakpoint';
    }

    const comebackFromFunc = prevStackFrames && currentStackFrames.length < prevStackFrames.length;
    if (comebackFromFunc) {
      // Offset the {hitCount} increment if it comes back from a function
      lineBreakpoints?.decrementHitCount();
      if (matchedBreakpoint) {
        this.currentMetaVariableMap.set('hitCount', String(matchedBreakpoint.hitCount));
      }
      if (stepType === 'step_over') {
        await this.sendStoppedEvent(stopReason);
        return;
      }
    }
    else {
      await this.processActionpoint(lineBreakpoints);
    }

    // step_into is always stop
    if (stepType === 'step_into') {
      if (thrownException) {
        await this.session!.sendContinuationCommand('step_into');
      }
      await this.sendStoppedEvent(stopReason);
      return;
    }

    const executeByUser = !this.stackFramesWhenStepOut && !this.stackFramesWhenStepOver;
    if (executeByUser) {
      // Normal step
      if (!thrownException) {
        await this.sendStoppedEvent(stopReason);
        return;
      }

      // Pause on breakpoint
      if (matchedBreakpoint) {
        await this.sendStoppedEvent(stopReason);
        return;
      }

      // Prepare advanced step
      if (prevStackFrames) {
        if (stepType === 'step_out') {
          this.stackFramesWhenStepOut = prevStackFrames.slice();
        }
        else { // step_over
          this.stackFramesWhenStepOver = prevStackFrames.slice();
        }
      }
    }

    // Advanced step
    this.autoExecuting = true;
    if (this.stackFramesWhenStepOut) {
      // If go back to the same line in a loop
      if (prevStackFrames && equalsIgnoreCase(currentStackFrames[0].source.path, prevStackFrames[0].source.path) && currentStackFrames[0].line === prevStackFrames[0].line) {
        if (matchedBreakpoint) {
          await this.sendStoppedEvent(stopReason);
          return;
        }
      }
      else if (equalsIgnoreCase(this.stackFramesWhenStepOut[0].source.path, currentStackFrames[0].source.path) && this.stackFramesWhenStepOut[0].line === currentStackFrames[0].line) {
        // One more breath. The final adjustment
        const result = await this.session!.sendContinuationCommand('step_out');
        await this.checkContinuationStatus(result);
        return;
      }

      // Complated step out
      if (this.currentStackFrames!.length < this.stackFramesWhenStepOut.length) {
        await this.sendStoppedEvent(stopReason);
        return;
      }
    }
    else if (this.stackFramesWhenStepOver) {
      // If go back to the same line in a loop
      if (this.stackFramesWhenStepOver.length === currentStackFrames.length) {
        if (prevStackFrames && equalsIgnoreCase(currentStackFrames[0].source.path, prevStackFrames[0].source.path) && currentStackFrames[0].line === prevStackFrames[0].line) {
          await this.sendStoppedEvent(stopReason);
          return;
        }
      }

      // One more breath. The final adjustment
      if (equalsIgnoreCase(this.stackFramesWhenStepOver[0].source.path, currentStackFrames[0].source.path) && this.stackFramesWhenStepOver[0].line === currentStackFrames[0].line) {
        const result = await this.session!.sendContinuationCommand('step_over');
        await this.checkContinuationStatus(result);
        return;
      }

      // Complated step over
      if (this.stackFramesWhenStepOver.length === currentStackFrames.length) {
        await this.sendStoppedEvent(stopReason);
        return;
      }
    }

    // Pause on breakpoint
    if (matchedBreakpoint) {
      await this.sendStoppedEvent(stopReason);
      return;
    }

    // Interruptive pause
    if (this.pauseRequested) {
      this.currentMetaVariableMap.set('elapsedTime_ns', -1);
      this.currentMetaVariableMap.set('elapsedTime_ms', -1);
      this.currentMetaVariableMap.set('elapsedTime_s', -1);
      await this.session!.sendBreakCommand();
      await this.sendStoppedEvent('pause');
      return;
    }
    if (this.isPaused) {
      return;
    }

    const result = await this.session!.sendContinuationCommand('step_out');
    await this.checkContinuationStatus(result);
  }
  private async processActionpoint(lineBreakpoints?: LineBreakpoints): Promise<void> {
    if (!this.currentStackFrames || this.currentStackFrames.length === 0) {
      throw Error(`This message shouldn't appear.`);
    }
    if (!lineBreakpoints) {
      return;
    }
    if (!lineBreakpoints.hasAdvancedBreakpoint()) {
      return;
    }

    for await (const breakpoint of lineBreakpoints) {
      if (breakpoint.action && await this.evaluateCondition(breakpoint)) {
        await breakpoint.action();
      }
      if ((breakpoint.logMessage || breakpoint.logGroup) && await this.evaluateCondition(breakpoint)) {
        const tempMetaVariableNames: string[] = [];
        if (breakpoint.additionalMetaVariables) {
          breakpoint.additionalMetaVariables.forEach((value, key) => {
            tempMetaVariableNames.push(key);
            this.currentMetaVariableMap.set(key, value);
          });
        }

        await this.printLogMessage(breakpoint, 'stdout');

        tempMetaVariableNames.forEach((name) => this.currentMetaVariableMap.delete(name));
      }
    }
  }
  private async setVariable(variable: string, expression: string, contextOrStackFrame: dbgp.Context | dbgp.StackFrame): Promise<DebugProtocol.SetVariableResponse['body'] & DebugProtocol.SetExpressionResponse['body'] & DebugProtocol.EvaluateResponse['body']> {
    if (this.isClosedSession) {
      throw Error('Debug session is closed.');
    }

    const stackFrame = contextOrStackFrame instanceof dbgp.Context ? contextOrStackFrame.stackFrame : contextOrStackFrame;
    let value = await this.evaluator.eval(expression, stackFrame);
    if (typeof value === 'undefined') {
      value = '';
    }
    else if (value instanceof dbgp.ObjectProperty) {
      throw Error('Writing of objects is not supported.');
    }
    else if (value instanceof MetaVariable) {
      if (typeof value.value === 'object') {
        throw Error('Writing of objects is not supported.');
      }
      value = value.value;
    }

    value = typeof value === 'string' ? `"${value}"` : String(value);
    await this.evaluator.eval(`${variable} := ${value}`, stackFrame);
    return {
      result: variable,
      value,
      type: toType(this.session!.ahkVersion, value),
      variablesReference: 0,
    };
  }
  private sendAnnounce(message: string, category: 'stdout' | 'stderr' | 'console' = 'console', level?: AnnounceLevel): void {
    const announceLevelOrder = [ false, 'error', true, 'detail' ];
    if (this.config.useAnnounce === false) {
      return;
    }

    const announceLevel: AnnounceLevel = level ?? (category === 'stderr' ? 'error' : true);
    const targetLevel = announceLevelOrder.indexOf(this.config.useAnnounce);
    const outputLevel = announceLevelOrder.indexOf(announceLevel);
    if (targetLevel < outputLevel) {
      return;
    }
    this.sendEvent(new OutputEvent(`${message}\n`, category));
  }
  private sendOutputEvent(message: string, category: 'stdout' | 'stderr' | 'console' = 'stdout'): void {
    this.sendEvent(new OutputEvent(message, category));
  }
  private sendOutputDebug(message: string): void {
    if (!this.config.useOutputDebug) {
      return;
    }
    const { category, useTrailingLinebreak } = this.config.useOutputDebug;

    let fixedMessage = message;
    if (useTrailingLinebreak && !(/(\r\n|\n)$/u).test(fixedMessage)) {
      fixedMessage += '\n';
    }
    this.sendOutputEvent(fixedMessage, category);
  }
  private sendTerminateEvent(): void {
    this.traceLogger.log('sendTerminateEvent');
    if (this.isTerminateRequested) {
      return;
    }

    this.isTerminateRequested = true;
    this.sendEvent(new TerminatedEvent());
  }
  private async sendStoppedEvent(stopReason: StopReason): Promise<void> {
    this.traceLogger.log('sendStoppedEvent');
    if (this.isPaused) {
      return;
    }

    this.stackFramesWhenStepOut = undefined;
    this.stackFramesWhenStepOver = undefined;
    this.pauseRequested = false;
    this.isPaused = true;
    this.autoExecuting = false;

    await this.displayPerfTips(this.currentMetaVariableMap);
    this.sendEvent(new StoppedEvent(stopReason, this.session!.id));
  }
  private createMetaVariables(response: dbgp.ContinuationResponse): MetaVariableValueMap {
    const elapsedTime_ns = parseFloat(String(this.currentMetaVariableMap.get('elapsedTime_ns') ?? '0')) + response.elapsedTime.ns;
    const elapsedTime_ms = parseFloat(String(this.currentMetaVariableMap.get('elapsedTime_ms') ?? '0')) + response.elapsedTime.ms;
    const elapsedTime_s = parseFloat(String(this.currentMetaVariableMap.get('elapsedTime_s') ?? '0')) + response.elapsedTime.s;

    const metaVariables = new MetaVariableValueMap();
    metaVariables.set('now', now());
    metaVariables.set('hitCount', -1);
    metaVariables.set('elapsedTime_ns', toFixed(elapsedTime_ns, 3));
    metaVariables.set('elapsedTime_ms', toFixed(elapsedTime_ms, 3));
    metaVariables.set('elapsedTime_s', toFixed(elapsedTime_s, 3));

    const { id: frameId, name: thisCallstack } = this.currentStackFrames![0];
    metaVariables.set('thisCallstack', thisCallstack);
    this.metaVaribalesByFrameId.set(frameId, metaVariables);

    const categories = new LazyPromise<Categories>((resolve) => {
      this.variableManager!.createCategories(-1).then((result) => {
        resolve(result);
      });
    });
    metaVariables.set('variableCategories', categories);
    const categoriesLength = this.config.variableCategories?.length ?? 3;
    for (const i of range(categoriesLength)) {
      metaVariables.set(`variableCategories[${i + 1}]`, new LazyPromise((resolve) => {
        categories.then((categories) => {
          resolve(categories[i]);
        });
      }));
    }

    const callstack = Object.fromEntries(this.currentStackFrames?.map((stackFrame, i) => {
      return [
        `[${i + 1}]`,
        {
          name: stackFrame.name,
          path: stackFrame.source.path,
          line: stackFrame.line,
        },
      ];
    }) ?? []);
    metaVariables.set('callstack', callstack);
    Object.entries(callstack).forEach(([ index, callstackItem ]) => {
      metaVariables.set(`callstack${index}`, callstackItem);
      Object.entries(callstackItem).forEach(([ key, value ]) => {
        metaVariables.set(`callstack${index}.${key}`, value);
      });
    });
    metaVariables.set('callstack.trace', Object.entries(callstack).map(([ i, item ]) => {
      const trace = `> ${item.path}:${item.line} [${item.name}]`;
      if (i === '[1]') {
        return `[Call Stack]\r\n${trace}`;
      }
      return trace;
    }).join('\r\n'));
    const callstackNames = Object.fromEntries(Object.entries(callstack).map(([ index, callstackItem ]) => [ index, callstackItem.name ]));
    metaVariables.set('callstackNames', callstackNames);
    Object.entries(callstackNames).forEach(([ index, callstackName ]) => {
      metaVariables.set(`callstackNames${index}`, callstackName);
    });

    return metaVariables;
  }
  private async evaluateCondition(breakpoint: Breakpoint): Promise<boolean> {
    if (!(breakpoint.condition || breakpoint.hitCondition)) {
      return true;
    }

    try {
      const { condition, hitCondition, hitCount } = breakpoint;
      this.currentMetaVariableMap.set('hitCount', hitCount);

      let conditionResult = false, hitConditionResult = false;
      if (condition) {
        const rawResult = await this.evaluator.eval(condition);
        conditionResult = toJavaScriptBoolean(rawResult);
      }
      if (hitCondition) {
        const match = hitCondition.match(/^\s*(?<operator><=|<|>=|>|==|=|%)?\s*(?<number>\d+)\s*$/u);
        if (match?.groups) {
          const { operator = '>=' } = match.groups;
          const number = parseInt(match.groups.number, 10);

          if (operator === '=' || operator === '==') {
            hitConditionResult = hitCount === number;
          }
          else if (operator === '>') {
            hitConditionResult = hitCount > number;
          }
          else if (operator === '>=') {
            hitConditionResult = hitCount >= number;
          }
          else if (operator === '<') {
            hitConditionResult = hitCount < number;
          }
          else if (operator === '<=') {
            hitConditionResult = hitCount <= number;
          }
          else if (operator === '%') {
            hitConditionResult = hitCount % number === 0;
          }
        }
      }

      let matchCondition = false;
      if (condition && hitCondition) {
        matchCondition = conditionResult && hitConditionResult;
      }
      else if (condition || hitCondition) {
        matchCondition = conditionResult || hitConditionResult;
      }

      return matchCondition;
    }
    catch (e: unknown) {
      if (e instanceof dbgp.DbgpCriticalError) {
        this.criticalError(e.message);
      }
    }

    return false;
  }
  private async printLogMessage(breakpoint: Breakpoint, logCategory?: LogCategory): Promise<void> {
    const { logMessage, hitCount } = breakpoint;
    const metaVariables = new MetaVariableValueMap(this.currentMetaVariableMap.entries());
    metaVariables.set('hitCount', hitCount);

    try {
      const timeout_ms = 30 * 1000;
      const logDataList = await timeoutPromise(this.logEvalutor!.eval(logMessage), timeout_ms).catch((e: unknown) => {
        const messageHead = `Log Error at ${breakpoint.filePath}:${breakpoint.line}`;
        if (e instanceof ParseError) {
          const messageBody = e.message.split(/\r\n|\n/u).slice(1).join('\n');
          this.sendAnnounce(`${messageHead}\n${messageBody}`, 'stderr');
          return;
        }
        else if (e instanceof Error) {
          this.sendAnnounce(`${messageHead}\n${e.message}`, 'stderr');
          return;
        }

        if (e instanceof dbgp.DbgpCriticalError) {
          this.criticalError(e.message);
          return;
        }

        // If the message is output in disconnectRequest, it may not be displayed, so output it here
        this.isTimeout = true;
        this.sendAnnounce('Debugging stopped for the following reasons: Timeout occurred in communication with the debugger when the following log was output.', 'stderr');
        this.sendAnnounce(`[${breakpoint.filePath}:${breakpoint.line}] ${logMessage}`, 'stderr');
        this.sendTerminateEvent();
      });

      if (!logDataList) {
        return;
      }

      const invokeBeforeAction = async(actionPrefixes?: ActionLogPrefixData[]): Promise<void> => {
        const clearAction = actionPrefixes?.find((action) => action.value === 'clear');
        if (clearAction) {
          await (this.createBreakpointAction('ClearConsole')?.());
        }
      };
      const invokeAfterAction = async(actionPrefixes?: ActionLogPrefixData[]): Promise<void> => {
        const breakAction = actionPrefixes?.find((action) => action.value === 'break');
        if (breakAction) {
          this.sendStoppedEvent('breakpoint');
        }
        return Promise.resolve();
      };

      for await (const logData of logDataList) {
        const logActions = logData.prefixes.filter((prefix): prefix is ActionLogPrefixData => prefix.type === 'action');

        await invokeBeforeAction(logActions);
        const outputEvent = this.createOutputEvent(logData, { source: { path: breakpoint.filePath }, line: breakpoint.line });
        if (outputEvent) {
          this.sendEvent(outputEvent);
        }
        await invokeAfterAction(logActions);
      }
    }
    catch (e: unknown) {
      if (e instanceof dbgp.DbgpCriticalError) {
        this.criticalError(e.message);
      }
    }
  }
  private createOutputEvent(logData: LogData, extraInfo?: Partial<DebugProtocol.OutputEvent['body']>): DebugProtocol.OutputEvent | undefined {
    const label = logData.type === 'primitive' ? String(logData.value) : logData.label;
    if ((/^\s*$/u).test(label)) {
      return undefined;
    }

    const group = logData.prefixes.reverse().find((prefix) => prefix.type === 'group') as GroupLogPrefixData | undefined;
    const category = logData.prefixes.reverse().find((prefix) => prefix.type === 'category') as CategoryLogPrefixData | undefined;
    const createCategory = (category: CategoryLogPrefixData | undefined): string | undefined => {
      switch (category?.value) {
        case 'error': return 'stderr';
        case 'info': return 'console';
        case 'nortice': return 'important';
        default: return undefined;
      }
    };

    const event: DebugProtocol.OutputEvent = new OutputEvent(label, createCategory(category));
    if (logData.type === 'object') {
      const variableGroup = new MetaVariable(logData.label, logData.value.map((obj) => new MetaVariable(obj.name, obj)));
      const variablesReference = this.variableManager!.createVariableReference(variableGroup);
      this.logObjectsMap.set(variablesReference, variableGroup);
      event.body.variablesReference = variablesReference;
    }

    event.body.group = group?.value;
    event.body = {
      ...extraInfo,
      ...event.body,
    };
    return event;
  }
  private criticalError(message: string): void {
    this.raisedCriticalError = true;
    const fixedMessage = this.fixPathOfRuntimeError(message);
    this.sendAnnounce(fixedMessage, 'stderr');
    this.sendTerminateEvent();
  }
  private async displayPerfTips(metaVariableMap: MetaVariableValueMap): Promise<void> {
    if (!this.config.usePerfTips) {
      return;
    }
    if (!this.currentStackFrames || this.currentStackFrames.length === 0) {
      return;
    }

    try {
      const { source, line } = this.currentStackFrames[0];
      const document = await vscode.workspace.openTextDocument(source.path);
      let line_0base = line - 1;
      if (line_0base === document.lineCount) {
        line_0base--; // I don't know about the details, but if the script stops at the end of the file and it's not a blank line, then line_0base will be the value of `document.lineCount + 1`, so we'll compensate for that
      }

      const { format } = this.config.usePerfTips;
      const logDataList = await timeoutPromise(this.logEvalutor!.eval(format), 5000).catch((e: unknown) => {
        if (e instanceof dbgp.DbgpCriticalError) {
          this.criticalError(e.message);
          return;
        }

        // If the message is output in disconnectRequest, it may not be displayed, so output it here
        this.isTimeout = true;
        this.sendAnnounce('Debugging stopped for the following reasons: Timeout occurred in communication with the debugger when the following perftips was output.', 'stderr');
        this.sendAnnounce(`[${source.path}:${line}] ${format}`, 'stderr');
        this.sendTerminateEvent();
      });

      if (!logDataList || logDataList.length === 0 || logDataList[0].type === 'object') {
        return;
      }

      const message = String(logDataList[0].value);
      const decorationType = vscode.window.createTextEditorDecorationType({
        after: {
          fontStyle: this.config.usePerfTips.fontStyle,
          color: this.config.usePerfTips.fontColor,
          contentText: ` ${message}`,
        },
      });
      this.perfTipsDecorationTypes.push(decorationType);

      const textLine = document.lineAt(line_0base);
      const startPosition = textLine.range.end;
      const endPosition = new vscode.Position(line_0base, textLine.range.end.character + message.length - 1);
      const decoration = { range: new vscode.Range(startPosition, endPosition) } as vscode.DecorationOptions;

      const editor = await vscode.window.showTextDocument(document);
      if (this.isTerminateRequested) {
        return; // If debugging terminated while the step is running, the decorations may remain display
      }
      editor.setDecorations(decorationType, [ decoration ]);
    }
    catch (e: unknown) {
      if (e instanceof dbgp.DbgpCriticalError) {
        this.criticalError(e.message);
      }
    }
  }
  private clearPerfTipsDecorations(): void {
    if (!this.config.usePerfTips) {
      return;
    }

    for (const editor of vscode.window.visibleTextEditors) {
      for (const decorationType of this.perfTipsDecorationTypes) {
        editor.setDecorations(decorationType, []);
      }
    }
  }
  private async createServer(args: LaunchRequestArguments): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.server = net.createServer()
        .listen(args.port, args.hostname)
        .on('connection', (socket) => {
          try {
            this.session = new dbgp.Session(socket, this.traceLogger)
              .on('init', (initPacket: dbgp.InitPacket) => {
                if (typeof this.session === 'undefined') {
                  return;
                }
                this.sendAnnounce(`Debugger Adapter Version: ${String(debuggerAdapterVersion)}`, 'console', 'detail');
                this.sendAnnounce(`Debug Configuration (${this.config.request}): ${this.config.name}`, 'console', 'detail');
                this.sendAnnounce(`AutoHotkey Version: ${this.session.ahkVersion.full}`, 'console', 'detail');
                if (0 < this.delayedWarningMessages.length) {
                  this.delayedWarningMessages.forEach((message) => {
                    this.sendOutputEvent(message, 'stdout');
                  });
                }

                this.evaluator = new ExpressionEvaluator(this.session, { metaVariableMap: this.currentMetaVariableMap });
                this.logEvalutor = new LogEvaluator(this.session, { metaVariableMap: this.currentMetaVariableMap });
                this.intellisense = new IntelliSense(this.session);
                completionItemProvider.useIntelliSenseInDebugging = this.config.useIntelliSenseInDebugging;
                completionItemProvider.intellisense = this.intellisense;
                this.symbolFinder = new SymbolFinder(this.session.ahkVersion, readFileCacheSync);
                this.sendEvent(new InitializedEvent());
              })
              .on('warning', (warning: string) => {
                this.sendOutputEvent(`${warning}\n`);
              })
              .on('error', (error?: Error) => {
                this.traceLogger.log('session error');
                if (!this.isTerminateRequested && error) {
                  this.sendAnnounce(`Session closed for the following reasons: ${error.message}`, 'stderr');
                }

                // this.sendEvent(new ThreadEvent('Session exited.', this.session!.id));
                this.sendTerminateEvent();
              })
              .on('close', () => {
                this.traceLogger.log('session close');
              })
              .on('stdout', (data) => {
                this.ahkProcess!.event.emit('stdout', String(data));
              })
              .on('stderr', (data) => {
                this.ahkProcess!.event.emit('stderr', String(data));
              })
              .on('outputdebug', (data) => {
                const message = String(data);
                const isRuntimeError = (/^Error.*:\s*[^\s].+Line#.*--->\t\d+:.+$/us).test(message);
                this.ahkProcess!.event.emit(isRuntimeError ? 'stderr' : 'outputdebug', message);
              });

            this.breakpointManager = new BreakpointManager(this.session);
            this.variableManager = new VariableManager(this, this.config.variableCategories);
            this.sendEvent(new ThreadEvent('Session started.', this.session.id));
            resolve();
          }
          catch (error: unknown) {
            this.traceLogger.log('Failed to start session');
            reject(error);
          }
        });
    });
  }
  private async jumpToError(): Promise<boolean> {
    if (this.config.useAutoJumpToError && this.errorMessage) {
      const match = this.errorMessage.match(/^(?<filePath>.+):(?<line>\d+)(?=\s:\s==>)/u);
      if (match?.groups) {
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
      }
    }
    return false;
  }
  private async openFileOnExit(): Promise<void> {
    if (!this.config.openFileOnExit) {
      return;
    }
    if (pathExistsSync(this.config.openFileOnExit)) {
      const doc = await vscode.workspace.openTextDocument(this.config.openFileOnExit);
      vscode.window.showTextDocument(doc);
    }
    else {
      const message = {
        id: 1,
        format: `File not found. Value of \`openFileOnExit\` in launch.json: \`${this.config.openFileOnExit}\``,
      } as DebugProtocol.Message;
      // For some reason, the error message could not be displayed by the following method.
      // this.sendErrorResponse(response, message);
      vscode.window.showErrorMessage(message.format);
    }
  }
}
