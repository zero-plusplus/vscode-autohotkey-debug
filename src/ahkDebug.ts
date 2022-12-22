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
import { ImplicitLibraryPathExtractor, IncludePathExtractor } from '@zero-plusplus/autohotkey-utilities';
import {
  Breakpoint,
  BreakpointAdvancedData,
  BreakpointManager,
  LineBreakpoints,
} from './util/BreakpointManager';
import { toFixed } from './util/numberUtils';
import { equalsIgnoreCase } from './util/stringUtils';
import { TraceLogger } from './util/TraceLogger';
import { completionItemProvider } from './CompletionItemProvider';
import * as dbgp from './dbgpSession';
import { AutoHotkeyLauncher, AutoHotkeyProcess } from './util/AutoHotkeyLuncher';
import { now, timeoutPromise, toFileUri } from './util/util';
import matcher from 'matcher';
import { Categories, Category, MetaVariable, MetaVariableValue, MetaVariableValueMap, Scope, StackFrames, Variable, VariableManager, formatProperty } from './util/VariableManager';
import { AhkConfigurationProvider, CategoryData } from './extension';
import { version as debuggerAdapterVersion } from '../package.json';
import { SymbolFinder } from './util/SymbolFinder';
import { ExpressionEvaluator, ParseError, toJavaScriptBoolean, toType } from './util/evaluator/ExpressionEvaluator';

export type AnnounceLevel = boolean | 'error' | 'detail';
export type FunctionBreakPointAdvancedData = { name: string; condition?: string; hitCondition?: string; logPoint?: string };
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
  useFunctionBreakpoint: boolean | Array<string | FunctionBreakPointAdvancedData>;
  openFileOnExit: string;
  trace: boolean;
  skipFunctions?: string[];
  skipFiles?: string[];
  variableCategories?: CategoryData[];
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
  private autoExecuting = false;
  private pauseRequested = false;
  private isPaused = false;
  private isTerminateRequested = false;
  private readonly configProvider: AhkConfigurationProvider;
  private symbolFinder?: sym.SymbolFinder;
  private callableSymbols: sym.NamedNodeBase[] | undefined;
  private exceptionArgs?: DebugProtocol.SetExceptionBreakpointsArguments;
  private get isClosedSession(): boolean {
    return this.session!.socketClosed || this.isTerminateRequested;
  }
  private server?: net.Server;
  private ahkProcess?: AutoHotkeyProcess;
  private readonly metaVaribalesByFrameId = new Map<number, MetaVariableValueMap>();
  private variableManager?: VariableManager;
  private readonly logObjectsMap = new Map<number, (Variable | Scope | Category | Categories | MetaVariable | undefined)>();
  private breakpointManager?: BreakpointManager;
  private readonly registeredFunctionBreakpoints: Breakpoint[] = [];
  private evaluator!: ExpressionEvaluator;
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
  constructor(provider: AhkConfigurationProvider) {
    super('autohotkey-debug.txt');

    this.configProvider = provider;
    this.traceLogger = new TraceLogger((e): void => {
      this.sendEvent(e);
    });
    this.setDebuggerColumnsStartAt1(true);
    this.setDebuggerLinesStartAt1(true);
    this.setDebuggerPathFormat('uri');
  }
  protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
    response.body = {
      supportsConditionalBreakpoints: true,
      supportsConfigurationDoneRequest: true,
      supportsEvaluateForHovers: true,
      supportsHitConditionalBreakpoints: true,
      supportsLoadedSourcesRequest: true,
      supportsLogPoints: true,
      supportsSetVariable: true,
      supportTerminateDebuggee: true,
    };

    const config = this.configProvider.config!;
    if (config.useExceptionBreakpoint) {
      response.body.supportsExceptionOptions = true;
      response.body.supportsExceptionFilterOptions = true;
      response.body.supportsExceptionInfoRequest = true;
      response.body.exceptionBreakpointFilters = [
        {
          filter: 'caught-exceptions',
          label: 'Caught Exceptions',
          conditionDescription: '',
          supportsCondition: true,
          default: false,
        },
        {
          filter: 'uncaught-exceptions',
          label: 'Uncaught Breakpoint',
          conditionDescription: '',
          supportsCondition: false,
          default: false,
        },
      ];
    }
    if (config.useFunctionBreakpoint) {
      response.body.supportsFunctionBreakpoints = true;
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
      this.sendErrorResponse(response, { id: 2, format: errorMessage });
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

    const state = (this.exceptionArgs.filterOptions ?? []).some((filter) => filter.filterId.endsWith('exceptions'));
    await this.session!.sendExceptionBreakpointCommand(state);
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
    const breakpoints: Array<DebugProtocol.FunctionBreakpoint | FunctionBreakPointAdvancedData> = [ ...args.breakpoints ];
    if (!this.callableSymbols) {
      if (typeof this.config.useFunctionBreakpoint === 'object') {
        breakpoints.push(...this.config.useFunctionBreakpoint.map((breakpoint) => {
          return typeof breakpoint === 'string' ? { name: breakpoint } : breakpoint;
        }));
      }
      this.callableSymbols = this.symbolFinder!
        .find(this.config.program)
        .filter((node) => [ 'function', 'getter', 'setter' ].includes(node.type)) as sym.NamedNodeBase[];
    }

    for await (const breakpoint of breakpoints) {
      const isMatch = wildcard(breakpoint.name, { separator: '.' });
      const symbols = this.callableSymbols.filter((symbol) => isMatch(sym.getFullName(symbol)));
      for await (const symbol of symbols) {
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
          if ('logPoint' in breakpoint && breakpoint.logPoint !== '') {
            advancedData.logMessage = breakpoint.logPoint;
          }

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

    this.currentMetaVariableMap.clear();
    this.pauseRequested = false;
    this.isPaused = false;

    this.clearPerfTipsDecorations();
    const result = await this.session!.sendContinuationCommand('step_out');
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

    try {
      let fullName = args.name;
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

      let data = await this.evaluator.eval(args.value);
      const typeName = toType(this.session!.ahkVersion, data);
      if (!data) {
        data = 'Not initialized';
      }
      else if (typeof data === 'object') {
        this.sendErrorResponse(response, {
          id: args.variablesReference,
          format: 'Only primitive values are supported. e.g. "string", 123, 0x123, 1.0e+5, true',
        } as DebugProtocol.Message);
        return;
      }
      data = String(data);

      const dbgpResponse = await this.session!.sendPropertySetCommand({
        context,
        fullName,
        typeName,
        data,
      });
      if (!dbgpResponse.success) {
        this.sendErrorResponse(response, {
          id: args.variablesReference,
          format: 'Rewriting failed. Probably read-only.',
        } as DebugProtocol.Message);
        return;
      }

      const { properties } = await this.session!.sendPropertyGetCommand(context, fullName);
      response.body = {
        type: typeName,
        variablesReference: 0,
        value: formatProperty(properties[0], this.session?.ahkVersion),
      };
      this.sendResponse(response);
    }
    catch (error: unknown) {
      let message = error instanceof Error ? error.message : '';
      if (error instanceof ParseError) {
        message = `Failed to parse value. Only primitive values are supported. e.g. "string", 123, 0x123, 1.0e+5, true`;
      }

      this.sendErrorResponse(response, {
        id: args.variablesReference,
        format: message,
      } as DebugProtocol.Message);
    }
  }
  protected async evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments, request?: DebugProtocol.Request): Promise<void> {
    return asyncLock.acquire('evaluateRequest', async() => {
      this.traceLogger.log('evaluateRequest');

      if (args.context === 'variables') {
        this.sendResponse(response);
        return;
      }

      if (this.isClosedSession) {
        this.sendResponse(response);
        return;
      }

      const propertyName = args.context === 'hover' ? args.expression.replace(/^&/u, '') : args.expression;
      try {
        if (!args.frameId) {
          throw Error('Error: Cannot evaluate code without a session');
        }

        const stackFrame = this.variableManager!.getStackFrame(args.frameId);
        if (!stackFrame) {
          throw Error('Error: Could not get stack frame');
        }

        const value = await this.evaluator.eval(propertyName, stackFrame.dbgpStackFrame);
        if (typeof value === 'undefined') {
          if (args.context === 'hover' && (await this.session!.fetchAllPropertyNames()).find((name) => equalsIgnoreCase(name, propertyName))) {
            response.body = {
              result: 'Not initialized',
              type: 'undefined',
              variablesReference: -1,
            };
          }
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
      catch (error: unknown) {
        if (error instanceof dbgp.DbgpCriticalError) {
          this.criticalError(error);
          return;
        }

        if (args.context !== 'hover') {
          const errorMessage = error instanceof Error ? error.message : 'User will never see this message.';
          response.body = { result: errorMessage, variablesReference: 0 };
        }
        this.sendResponse(response);
      }
    });
  }
  protected sourceRequest(response: DebugProtocol.SourceResponse, args: DebugProtocol.SourceArguments, request?: DebugProtocol.Request): void {
    this.traceLogger.log('sourceRequest');
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
  private async registerDebugDirective(): Promise<void> {
    if (!this.config.useDebugDirective) {
      return;
    }
    const {
      useBreakpointDirective,
      useOutputDirective,
      useClearConsoleDirective,
    } = this.config.useDebugDirective;

    const filePathListChunked = chunk(await this.getAllLoadedSourcePath(), 50); // https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/203

    // const DEBUG_start = process.hrtime();
    for await (const filePathList of filePathListChunked) {
      await Promise.all(filePathList.map(async(filePath) => {
        const document = await vscode.workspace.openTextDocument(filePath);
        const fileUri = toFileUri(filePath);

        await Promise.all(range(document.lineCount).map(async(line_0base) => {
          const textLine = document.lineAt(line_0base);
          const match = textLine.text.match(/^\s*;\s*@Debug-(?<directiveType>[\w_]+)(?::(?<params>[\w_:]+))?\s*(?=\(|\[|-|=|$)(?:\((?<condition>[^\n)]+)\))?\s*(?:\[(?<hitCondition>[^\n]+)\])?\s*(?:(?<outputOperator>->|=>)?(?<leaveLeadingSpace>\|)?(?<message>.*))?$/ui);
          if (!match?.groups) {
            return;
          }

          const directiveType = match.groups.directiveType.toLowerCase();
          const {
            condition = '',
            hitCondition = '',
            outputOperator,
            message = '',
          } = match.groups;
          const params = match.groups.params ? match.groups.params.split(':') : '';
          const removeLeadingSpace = match.groups.leaveLeadingSpace ? !match.groups.leaveLeadingSpace : true;

          let logMessage = message;
          if (removeLeadingSpace) {
            logMessage = logMessage.trimLeft();
          }
          if (outputOperator === '=>') {
            logMessage += '\n';
          }

          try {
            const line = line_0base + 1;
            if (useBreakpointDirective && directiveType === 'breakpoint') {
              if (0 < params.length) {
                return;
              }

              const advancedData = {
                condition,
                hitCondition,
                logMessage,
                shouldBreak: true,
                hidden: true,
              } as BreakpointAdvancedData;
              await this.breakpointManager!.registerBreakpoint(fileUri, line, advancedData);
            }
            else if (useOutputDirective && directiveType === 'output') {
              let logGroup: string | undefined;
              if (0 < params.length) {
                if (equalsIgnoreCase(params[0], 'start')) {
                  logGroup = 'start';
                }
                else if (equalsIgnoreCase(params[0], 'startCollapsed')) {
                  logGroup = 'startCollapsed';
                }
                else if (equalsIgnoreCase(params[0], 'end')) {
                  logGroup = 'end';
                }
              }
              const newCondition = condition;
              const advancedData = {
                condition: newCondition,
                hitCondition,
                logMessage,
                logGroup,
                hidden: true,
              } as BreakpointAdvancedData;
              await this.breakpointManager!.registerBreakpoint(fileUri, line, advancedData);
            }
            else if (useClearConsoleDirective && directiveType === 'clearconsole') {
              const advancedData = {
                condition,
                hitCondition,
                logMessage,
                hidden: true,
                action: async() => {
                  // There is a lag between the execution of a command and the console being cleared. This lag can be eliminated by executing the command multiple times.
                  await vscode.commands.executeCommand('workbench.debug.panel.action.clearReplAction');
                  await vscode.commands.executeCommand('workbench.debug.panel.action.clearReplAction');
                  await vscode.commands.executeCommand('workbench.debug.panel.action.clearReplAction');
                },
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
    // const DEBUG_hrtime = process.hrtime(DEBUG_start);
    // // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    // // eslint-disable-next-line no-mixed-operators
    // const DEBUG_ns = DEBUG_hrtime[0] * 1e9 + DEBUG_hrtime[1];
    // const DEBUG_s = DEBUG_ns / 1e9;
    // this.printLogMessage(`elapsedTime: ${DEBUG_s}s`);
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
        await this.printLogMessage(breakpoint, 'stdout');
      }
    }
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
    catch (error: unknown) {
      if (error instanceof dbgp.DbgpCriticalError) {
        this.criticalError(error);
      }
    }

    return false;
  }
  private async printLogMessage(breakpoint: Breakpoint, logCategory?: LogCategory): Promise<void> {
    const { logMessage, logGroup = undefined, hitCount } = breakpoint;
    const metaVariables = new MetaVariableValueMap(this.currentMetaVariableMap.entries());
    metaVariables.set('hitCount', hitCount);

    try {
      const evalucatedMessages = await this.evaluateLog(logMessage, { file: breakpoint.filePath, line: breakpoint.line });
      const stringMessages = evalucatedMessages.filter((message) => typeof message === 'string' || typeof message === 'number') as string[];
      const objectMessages = evalucatedMessages.filter((message) => typeof message === 'object') as Array<Scope | Category | Categories | Variable>;
      if (objectMessages.length === 0) {
        const event: DebugProtocol.OutputEvent = new OutputEvent(stringMessages.join(''), logCategory);
        event.body.group = logGroup;
        this.sendEvent(event);
        return;
      }

      let label = evalucatedMessages.reduce((prev: string, current): string => {
        if (typeof current === 'string' || typeof current === 'number') {
          return `${prev}${current}`;
        }
        return prev;
      }, '');
      if (!label) {
        label = objectMessages.reduce((prev, current) => (prev ? `${prev}, ${current.name}` : current.name), '');
      }

      const variableGroup = new MetaVariable(label, objectMessages.map((obj) => new MetaVariable(obj.name, obj)));
      const variablesReference = this.variableManager!.createVariableReference(variableGroup);
      this.logObjectsMap.set(variablesReference, variableGroup);

      const event: DebugProtocol.OutputEvent = new OutputEvent(label, logCategory);
      event.body.group = logGroup;
      event.body.variablesReference = variablesReference;
      this.sendEvent(event);
    }
    catch (error: unknown) {
      if (error instanceof dbgp.DbgpCriticalError) {
        this.criticalError(error);
      }
    }
  }
  private criticalError(error: Error): void {
    this.raisedCriticalError = true;
    const fixedMessage = this.fixPathOfRuntimeError(error.message);
    this.sendAnnounce(fixedMessage, 'stderr');
    this.sendTerminateEvent();
  }
  private async evaluateLog(format: string, source: { file: string; line: number }): Promise<MetaVariableValue[]> {
    const results: MetaVariableValue[] = [];

    let current = '';
    try {
      let blockCount = 0;
      for (let i = 0; i < format.length; i++) {
        const char = format.charAt(i);

        if (0 < blockCount) {
          if (char === '}') {
            blockCount--;
            if (blockCount === 0) {
              const timeout_ms = 30 * 1000;
              if (current === '') {
                results.push('{}');
                continue;
              }
              // eslint-disable-next-line no-await-in-loop
              const value = await timeoutPromise(this.evaluator.eval(current), timeout_ms).catch((error: unknown) => {
                if (error instanceof dbgp.DbgpCriticalError) {
                  this.criticalError(error);
                  return;
                }

                // If the message is output in disconnectRequest, it may not be displayed, so output it here
                this.isTimeout = true;
                this.sendAnnounce('Debugging stopped for the following reasons: Timeout occurred in communication with the debugger when the following log was output', 'stderr');
                this.sendAnnounce(`[${source.file}:${source.line}] ${format}`, 'stderr');
                this.sendTerminateEvent();
              });

              if (value instanceof dbgp.ObjectProperty) {
                results.push(new Variable(this.session!, value));
              }
              else if (typeof value !== 'undefined') {
                results.push(value);
              }
              current = '';
            }
            continue;
          }

          current += char;
          continue;
        }

        if (char === '\\' && [ '{' ].includes(format.charAt(i + 1))) {
          current += format.slice(i + 1, i + 2);
          i++;
          continue;
        }

        if (char === '{') {
          blockCount++;
          if (current) {
            results.push(current);
            current = '';
          }
          continue;
        }

        current += char;
      }

      if (current) {
        results.push(current);
      }
    }
    catch (e: unknown) {
      const messageHead = `Log Error at ${source.file}:${source.line}`;
      if (e instanceof ParseError) {
        const messageBody = e.message.split(/\r\n|\n/u).slice(1).join('\n');
        this.sendAnnounce(`${messageHead}\n${messageBody}`, 'stderr');
      }
      else if (e instanceof Error) {
        this.sendAnnounce(`${messageHead}\n${e.message}`, 'stderr');
      }
    }
    return results;
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
      const message = (await this.evaluateLog(format, { file: source.path, line: line_0base })).reduce((prev: string, current) => {
        if (typeof current === 'string') {
          return prev + current;
        }
        return prev;
      }, '');

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
    catch (error: unknown) {
      if (error instanceof dbgp.DbgpCriticalError) {
        this.criticalError(error);
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

                completionItemProvider.useIntelliSenseInDebugging = this.config.useIntelliSenseInDebugging;
                completionItemProvider.session = this.session;
                this.evaluator = new ExpressionEvaluator(this.session, this.currentMetaVariableMap);
                if (this.config.useFunctionBreakpoint) {
                  this.symbolFinder = new SymbolFinder(this.session.ahkVersion);
                }
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
