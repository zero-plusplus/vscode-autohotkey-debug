import * as path from 'path';
import * as net from 'net';
import { stat } from 'fs';

import * as vscode from 'vscode';
import {
  Handles,
  InitializedEvent,
  LoggingDebugSession,
  OutputEvent,
  StoppedEvent,
  TerminatedEvent,
  Thread,
  ThreadEvent,
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { URI } from 'vscode-uri';
import { sync as pathExistsSync } from 'path-exists';
import * as AsyncLock from 'async-lock';
import { range } from 'lodash';
import AhkIncludeResolver from '@zero-plusplus/ahk-include-path-resolver';
import {
  Breakpoint,
  BreakpointAdvancedData,
  BreakpointLogGroup,
  BreakpointManager,
  LineBreakpoints,
} from './util/BreakpointManager';
import { CaseInsensitiveMap } from './util/CaseInsensitiveMap';
import { Parser, createParser } from './util/ConditionParser';
import { ConditionalEvaluator } from './util/ConditionEvaluator';
import { toFixed } from './util/numberUtils';
import { equalsIgnoreCase } from './util/stringUtils';
import { TraceLogger } from './util/TraceLogger';
import { completionItemProvider } from './CompletionItemProvider';
import * as dbgp from './dbgpSession';
import { AutoHotkeyLauncher, AutoHotkeyProcess } from './util/AutoHotkeyLuncher';
import { timeoutPromise } from './util/util';
import { isNumber } from 'ts-predicates';
import * as matcher from 'matcher';
import { MatcherData, ScopeSelector, StackFrames, Variable, VariableManager, escapeAhk, formatProperty } from './util/VariableManager';
export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments, DebugProtocol.AttachRequestArguments {
  program: string;
  request: 'launch' | 'attach';
  runtime: string;
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
    prefix: string;
    suffix: string;
    removeTrailingLinebreak: boolean;
  };
  openFileOnExit: string;
  trace: boolean;
  skipFunctions?: string[];
  skipFiles?: string[];
  variableCategories?: 'Recommend' | Array<{
    label: string;
    source: ScopeSelector;
    matchers: MatcherData[];
  }>;
  suppressAnnounce: boolean;
  // The following is not a configuration, but is set to pass data to the debug adapter.
  cancelReason?: string;
  extensionContext: vscode.ExtensionContext;
}

type LogCategory = 'console' | 'stdout' | 'stderr';
type StopReason = 'step' | 'breakpoint' | 'hidden breakpoint' | 'pause';

export const serializePromise = async(promises: Array<Promise<void>>): Promise<void> => {
  await promises.reduce(async(prev, current): Promise<void> => {
    return prev.then(async() => current);
  }, Promise.resolve());
};

const asyncLock = new AsyncLock();
export class AhkDebugSession extends LoggingDebugSession {
  private readonly traceLogger: TraceLogger;
  private autoExecuting = false;
  private pauseRequested = false;
  private isPaused = false;
  private isTerminateRequested = false;
  private server?: net.Server;
  private session?: dbgp.Session;
  private ahkProcess?: AutoHotkeyProcess;
  private ahkParser!: Parser;
  private config!: LaunchRequestArguments;
  private variableManager?: VariableManager;
  private readonly logObjectsHandles = new Handles<Variable>();
  private breakpointManager?: BreakpointManager;
  private conditionalEvaluator!: ConditionalEvaluator;
  private prevStackFrames?: StackFrames;
  private currentStackFrames?: StackFrames;
  private currentMetaVariables: CaseInsensitiveMap<string, string> | null = null;
  private stackFramesWhenStepOut?: StackFrames;
  private stackFramesWhenStepOver?: StackFrames;
  private readonly perfTipsDecorationTypes: vscode.TextEditorDecorationType[] = [];
  private readonly loadedSources: string[] = [];
  private errorMessage = '';
  private exitCode?: number | undefined;
  constructor() {
    super('autohotkey-debug.txt');

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

    if (!args.restart) {
      if (isNumber(this.exitCode)) {
        this.sendAnnounce(`AutoHotkey closed for the following exit code: ${this.exitCode}\n`, this.exitCode === 0 ? 'console' : 'stderr');
        this.sendAnnounce('Debugging stopped.');
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

          if (isNumber(exitCode)) {
            this.exitCode = exitCode;
          }
          this.sendTerminateEvent();
        })
        .on('stdout', (message: string) => {
          const fixedData = this.fixPathOfRuntimeError(message);
          this.sendOutputEvent(fixedData, 'stdout');
        })
        .on('stderr', (message: string) => {
          this.errorMessage = this.fixPathOfRuntimeError(message);
          this.sendOutputEvent(this.errorMessage, 'stderr');
        })
        .on('outputdebug', (message: string) => {
          this.sendOutputDebug(message);
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
      this.sendAnnounce(`${this.config.cancelReason}\n`);
      this.sendTerminateEvent();
      this.sendResponse(response);
      return;
    }

    const ahkProcess = new AutoHotkeyLauncher(this.config).attach();
    if (!ahkProcess) {
      this.sendAnnounce(`Failed to attach "${this.config.program}".\n`, 'stderr');
      this.sendTerminateEvent();
      this.sendResponse(response);
      return;
    }

    this.sendAnnounce(`Attached to "${this.config.program}".\n`);
    this.ahkProcess = ahkProcess;
    this.ahkProcess.event
      .on('close', (exitCode?: number) => {
        if (this.isTerminateRequested) {
          return;
        }

        if (isNumber(exitCode)) {
          const category = exitCode === 0 ? 'console' : 'stderr';
          this.sendAnnounce(`AutoHotkey closed for the following exit code: ${exitCode}\n`, category);
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
      if (this.session!.socketClosed || this.isTerminateRequested) {
        this.sendResponse(response);
        return;
      }

      const filePath = args.source.path ?? '';
      const fileUri = URI.file(filePath).toString();
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
  protected async configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('configurationDoneRequest');
    this.sendResponse(response);
    if (this.session!.socketClosed || this.isTerminateRequested) {
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
    if (this.session!.socketClosed || this.isTerminateRequested) {
      return;
    }

    this.currentMetaVariables = null;
    this.pauseRequested = false;
    this.isPaused = false;

    this.clearPerfTipsDecorations();
    const result = await this.session!.sendContinuationCommand('run');
    this.checkContinuationStatus(result);
  }
  protected async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('nextRequest');
    this.sendResponse(response);
    if (this.session!.socketClosed || this.isTerminateRequested) {
      return;
    }

    this.currentMetaVariables = null;
    this.pauseRequested = false;
    this.isPaused = false;

    this.clearPerfTipsDecorations();
    const result = await this.session!.sendContinuationCommand('step_over');
    this.checkContinuationStatus(result);
  }
  protected async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('stepInRequest');
    this.sendResponse(response);
    if (this.session!.socketClosed || this.isTerminateRequested) {
      return;
    }

    this.currentMetaVariables = null;
    this.pauseRequested = false;
    this.isPaused = false;

    this.clearPerfTipsDecorations();
    const result = await this.session!.sendContinuationCommand('step_into');
    this.checkContinuationStatus(result);
  }
  protected async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('stepOutRequest');
    this.sendResponse(response);
    if (this.session!.socketClosed || this.isTerminateRequested) {
      return;
    }

    this.currentMetaVariables = null;
    this.pauseRequested = false;
    this.isPaused = false;

    this.clearPerfTipsDecorations();
    const result = await this.session!.sendContinuationCommand('step_out');
    this.checkContinuationStatus(result);
  }
  protected async pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('pauseRequest');
    this.sendResponse(response);
    if (this.session!.socketClosed || this.isTerminateRequested) {
      return;
    }

    this.pauseRequested = false;
    this.isPaused = false;

    if (this.autoExecuting) {
      this.pauseRequested = true;

      // Force pause
      setTimeout(() => {
        if (!this.isPaused) {
          if (this.session!.socketClosed || this.isTerminateRequested) {
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

    this.currentMetaVariables = null;
    const result = await this.session!.sendContinuationCommand('break');
    this.checkContinuationStatus(result);
  }
  protected threadsRequest(response: DebugProtocol.ThreadsResponse, request?: DebugProtocol.Request): void {
    this.traceLogger.log('threadsRequest');
    if (this.session!.socketClosed || this.isTerminateRequested) {
      this.sendResponse(response);
      return;
    }

    response.body = { threads: [ new Thread(this.session!.id, 'Thread 1') ] };
    this.sendResponse(response);
  }
  protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('stackTraceRequest');
    if (this.session!.socketClosed || this.isTerminateRequested) {
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
    if (0 < stackFrames.length) {
      response.body = {
        totalFrames: allStackFrames.length,
        stackFrames,
      };
    }
    else {
      response.body = {
        totalFrames: 1,
        stackFrames: [
          {
            id: -1,
            column: -1,
            line: -1,
            name: 'Idling (Click me if you want to see the variables)',
          },
        ],
      };
    }

    this.sendResponse(response);
  }
  protected async scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('scopesRequest');
    if (this.session!.socketClosed || this.isTerminateRequested) {
      this.sendResponse(response);
      return;
    }
    const scopes = await this.variableManager!.createScopes(args.frameId);
    response.body = {
      scopes: scopes.map((scope) => ({
        name: scope.name,
        expensive: scope.expensive,
        variablesReference: scope.variablesReference,
      })),
    };

    this.sendResponse(response);
  }
  protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('variablesRequest');

    if (this.session!.socketClosed || this.isTerminateRequested) {
      this.sendResponse(response);
      return;
    }

    const loggedVariable = this.logObjectsHandles.get(args.variablesReference) as Variable | undefined;
    if (loggedVariable) {
      response.body = {
        variables: [
          {
            name: loggedVariable.name,
            variablesReference: loggedVariable.variablesReference,
            value: loggedVariable.value,
            type: loggedVariable.type,
            indexedVariables: loggedVariable.indexedVariables,
            namedVariables: loggedVariable.namedVariables,
          },
        ],
      };
      this.sendResponse(response);
      return;
    }

    const objectVariable = this.variableManager!.getObjectVariable(args.variablesReference);
    const variables = objectVariable ? await objectVariable.createChildren(args) : await this.variableManager?.createVariables(args);
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
        })),
      };
    }
    this.sendResponse(response);
  }
  protected async setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('setVariableRequest');
    let typeName: string, data: string;
    const parsed = this.ahkParser.Primitive.parse(args.value);
    if ('value' in parsed) {
      const primitive = parsed.value.value;

      typeName = 'string';
      data = `${String(primitive.value)}`;
      if (primitive.type === 'Number') {
        const number = primitive.value;
        if (number.type === 'Integer') {
          typeName = 'integer';
          data = String(number.value);
        }
        else if (number.type === 'Hex') {
          typeName = 'integer';
          data = String(parseInt(number.value, 16));
        }
        else if (this.session!.ahkVersion.mejor === 2 && number.type === 'Scientific') {
          typeName = 'float';
          data = `${String(parseFloat(number.value))}.0`;
        }
        else {
          if (this.session!.ahkVersion.mejor === 2) {
            typeName = 'float';
          }
          data = String(number.value);
        }
      }
    }
    else if (args.value === '') {
      typeName = 'undefined';
      data = `Not initialized`;
    }
    else {
      this.sendErrorResponse(response, {
        id: args.variablesReference,
        format: 'Only primitive values are supported. e.g. "string", 123, 0x123, 1.0e+5, true',
      } as DebugProtocol.Message);
      return;
    }

    let fullName = args.name;
    let context: dbgp.Context;
    const objectVariable = this.variableManager!.getObjectVariable(args.variablesReference);
    if (objectVariable) {
      const name = args.name.startsWith('[') ? args.name : `.${args.name}`;
      fullName = `${objectVariable.fullName}${name}`;
      context = objectVariable.context;
    }
    else {
      context = this.variableManager!.getScope(args.variablesReference)!.context;
    }

    try {
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
      this.sendErrorResponse(response, {
        id: args.variablesReference,
        format: 'Command execution failed. This message is not normally displayed.',
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

      if (this.session!.socketClosed || this.isTerminateRequested) {
        this.sendResponse(response);
        return;
      }

      const propertyName = args.context === 'hover' ? args.expression.replace(/^&/u, '') : args.expression;
      try {
        if (!args.frameId) {
          throw Error('Error: Cannot evaluate code without a session');
        }

        const metaVariableParsed = this.ahkParser.MetaVariable.parse(propertyName);
        if (metaVariableParsed.status) {
          const metaVariableName = metaVariableParsed.value.value;
          if (this.currentMetaVariables?.has(metaVariableName)) {
            response.body = {
              result: this.currentMetaVariables.get(metaVariableName)!,
              type: 'metavariable',
              variablesReference: 0,
            };
            this.sendResponse(response);
            return;
          }
          throw Error('not available');
        }

        const propertyNameParsed = this.ahkParser.PropertyName.parse(propertyName);
        if (!propertyNameParsed.status) {
          throw Error('Error: Only the property name or meta variable is supported. e.g. `variable`,` object.field`, `array[1]`, `map["spaced key"]`, `prop.<base>`, `{hitCount}`');
        }
        const stackFrame = this.variableManager!.getStackFrame(args.frameId);
        if (!stackFrame) {
          throw Error('Error: Could not get stack frame');
        }

        const property = await this.session!.evaluate(propertyName, stackFrame.dbgpStackFrame);
        if (!property) {
          if (args.context === 'hover' && (await this.session!.fetchAllVariableNames()).find((name) => equalsIgnoreCase(name, propertyName))) {
            response.body = {
              result: 'Not initialized',
              type: 'undefined',
              variablesReference: -1,
            };
            this.sendResponse(response);
            return;
          }
          throw Error('not available');
        }

        const variable = new Variable(this.session!, property);
        response.body = {
          result: formatProperty(property, this.session?.ahkVersion),
          type: property.type,
          variablesReference: variable.variablesReference,
          indexedVariables: variable.indexedVariables,
          namedVariables: variable.namedVariables,
        };
        this.sendResponse(response);
      }
      catch (error: unknown) {
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
    const loadedScriptPathList = this.getAllLoadedSourcePath();

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
  private getAllLoadedSourcePath(): string[] {
    if (0 < this.loadedSources.length) {
      return this.loadedSources;
    }
    const resolver = new AhkIncludeResolver({
      rootPath: this.config.program,
      runtimePath: this.config.runtime,
      version: this.session!.ahkVersion.mejor as 1 | 2,
    });
    this.loadedSources.push(this.config.program);
    this.loadedSources.push(...resolver.extractAllIncludePath([ 'local', 'user', 'standard' ]));
    return this.loadedSources;
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

    const filePathList = this.getAllLoadedSourcePath();
    // const DEBUG_start = process.hrtime();
    await Promise.all(filePathList.map(async(filePath) => {
      const document = await vscode.workspace.openTextDocument(filePath);
      const fileUri = URI.file(filePath).toString();

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

        const line = line_0base + 1;
        const nextLine = line + 1;
        if (useBreakpointDirective && directiveType === 'breakpoint') {
          if (0 < params.length) {
            return;
          }

          const advancedData = {
            condition,
            hitCondition,
            logMessage,
            hidden: true,
          } as BreakpointAdvancedData;
          await this.breakpointManager!.registerBreakpoint(fileUri, nextLine, advancedData);
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
          await this.breakpointManager!.registerBreakpoint(fileUri, nextLine, advancedData);
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
          await this.breakpointManager!.registerBreakpoint(fileUri, nextLine, advancedData);
        }
      }));
    }));
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
      if (-1 < errorMessage.search(/^Error:\s{2}/gmu)) {
        fixed = errorMessage.replace(/^(Error:\s{2})/gmu, `${this.config.program}:${line} : ==> `);
      }
      else if (-1 < errorMessage.search(/^Error in #include file /u)) {
        fixed = errorMessage.replace(/Error in #include file "(.+)":\n\s*(.+)/gmu, `$1:${line} : ==> $2`);
      }

      fixed = fixed.replace(/\n(Specifically:)/u, '     $1');
      fixed = fixed.substr(0, fixed.indexOf('Line#'));
      return `${fixed.replace(/\s+$/u, '')}\n`;
    }
    return errorMessage.replace(/^(.+)\s\((\d+)\)\s:/gmu, `$1:$2 :`);
  }
  private async findMatchedBreakpoint(lineBreakpoints: LineBreakpoints | null): Promise<Breakpoint | null> {
    if (!lineBreakpoints) {
      return null;
    }

    for await (const breakpoint of lineBreakpoints) {
      if (breakpoint.action) {
        continue;
      }
      if (breakpoint.kind === 'breakpoint') {
        return breakpoint;
      }
      if (breakpoint.kind === 'conditional breakpoint' && await this.evalCondition(breakpoint)) {
        return breakpoint;
      }
    }
    return null;
  }
  private async checkContinuationStatus(response: dbgp.ContinuationResponse): Promise<void> {
    this.traceLogger.log('checkContinuationStatus');
    if (this.session!.socketClosed || this.isTerminateRequested) {
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
    const prevMetaVariables = this.currentMetaVariables;
    this.currentMetaVariables = new CaseInsensitiveMap<string, string>();
    this.currentMetaVariables.set('hitCount', '-1');
    if (prevMetaVariables) {
      const elapsedTime_ns = parseFloat(prevMetaVariables.get('elapsedTime_ns')!) + response.elapsedTime.ns;
      const elapsedTime_ms = parseFloat(prevMetaVariables.get('elapsedTime_ms')!) + response.elapsedTime.ms;
      const elapsedTime_s = parseFloat(prevMetaVariables.get('elapsedTime_s')!) + response.elapsedTime.s;
      this.currentMetaVariables.set('elapsedTime_ns', toFixed(elapsedTime_ns, 3));
      this.currentMetaVariables.set('elapsedTime_ms', toFixed(elapsedTime_ms, 3));
      this.currentMetaVariables.set('elapsedTime_s', toFixed(elapsedTime_s, 3));
    }
    else {
      this.currentMetaVariables.set('elapsedTime_ns', toFixed(response.elapsedTime.ns, 3));
      this.currentMetaVariables.set('elapsedTime_ms', toFixed(response.elapsedTime.ms, 3));
      this.currentMetaVariables.set('elapsedTime_s', toFixed(response.elapsedTime.s, 3));
    }
    this.prevStackFrames = this.currentStackFrames;
    const stackFrames = await this.variableManager!.createStackFrames();
    if (stackFrames.isIdle) {
      this.currentStackFrames = undefined;
      await this.sendStoppedEvent('pause');
      return;
    }

    const { source, line, name } = stackFrames[0];

    this.currentStackFrames = stackFrames;
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
      this.currentMetaVariables.set('elapsedTime_ns', '-1');
      this.currentMetaVariables.set('elapsedTime_ms', '-1');
      this.currentMetaVariables.set('elapsedTime_s', '-1');
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
      this.currentMetaVariables.set('hitCount', String(matchedBreakpoint.hitCount));
      await this.sendStoppedEvent(stopReason);
      return;
    }

    // Interruptive pause
    if (this.pauseRequested) {
      this.currentMetaVariables.set('elapsedTime_ns', '-1');
      this.currentMetaVariables.set('elapsedTime_ms', '-1');
      this.currentMetaVariables.set('elapsedTime_s', '-1');
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
  private async processStepExecution(stepType: dbgp.StepCommandName, lineBreakpoints: LineBreakpoints | null): Promise<void> {
    if (!this.currentMetaVariables || this.currentStackFrames?.isIdle) {
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
      this.currentMetaVariables.set('hitCount', String(matchedBreakpoint.hitCount));
      stopReason = matchedBreakpoint.hidden
        ? 'hidden breakpoint'
        : 'breakpoint';
    }

    const comebackFromFunc = prevStackFrames && currentStackFrames.length < prevStackFrames.length;
    if (comebackFromFunc) {
      // Offset the {hitCount} increment if it comes back from a function
      lineBreakpoints?.decrementHitCount();
      if (matchedBreakpoint) {
        this.currentMetaVariables.set('hitCount', String(matchedBreakpoint.hitCount));
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
      await this.sendStoppedEvent(stopReason);
      return;
    }

    const executeByUser = !this.stackFramesWhenStepOut && !this.stackFramesWhenStepOver;
    if (executeByUser) {
      // Normal step
      if (!lineBreakpoints) {
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
      this.currentMetaVariables.set('elapsedTime_ns', '-1');
      this.currentMetaVariables.set('elapsedTime_ms', '-1');
      this.currentMetaVariables.set('elapsedTime_s', '-1');
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
  private async processActionpoint(lineBreakpoints: LineBreakpoints | null): Promise<void> {
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
      if (breakpoint.action) {
        if (breakpoint.kind.includes('conditional') && !await this.evalCondition(breakpoint)) {
          continue;
        }

        await breakpoint.action();
        if (breakpoint.logMessage) {
          await this.printLogMessage(breakpoint, 'stdout');
        }
        continue;
      }

      if (breakpoint.kind.includes('logpoint')) {
        if (breakpoint.kind === 'conditional logpoint' && !await this.evalCondition(breakpoint)) {
          continue;
        }
        await this.printLogMessage(breakpoint, 'stdout');
      }
    }
  }
  private sendAnnounce(message: string, category: 'stdout' | 'stderr' | 'console' = 'console'): void {
    if (category !== 'stderr' && this.config.suppressAnnounce) {
      return;
    }
    this.sendEvent(new OutputEvent(message, category));
  }
  private sendOutputEvent(message: string, category: 'stdout' | 'stderr' | 'console' = 'stdout'): void {
    this.sendEvent(new OutputEvent(message, category));
  }
  private sendOutputDebug(message: string): void {
    if (!this.config.useOutputDebug) {
      return;
    }
    const { category, prefix, suffix, removeTrailingLinebreak } = this.config.useOutputDebug;

    const fixedMessage = prefix + (removeTrailingLinebreak ? message.replace(/(\r\n|\n)*$/u, '') : message) + suffix;
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

    if (this.currentMetaVariables) {
      await this.displayPerfTips(this.currentMetaVariables);
    }
    this.sendEvent(new StoppedEvent(stopReason, this.session!.id));
  }
  private async evalCondition(breakpoint: Breakpoint): Promise<boolean> {
    if (!this.currentMetaVariables) {
      throw Error(`This message shouldn't appear.`);
    }

    try {
      const { condition, hitCondition, hitCount } = breakpoint;
      const metaVariable = new CaseInsensitiveMap<string, string>(this.currentMetaVariables.entries());
      metaVariable.set('hitCount', String(hitCount));

      let conditionResult = false, hitConditionResult = false;
      if (condition) {
        conditionResult = await this.conditionalEvaluator.eval(condition, metaVariable);
      }
      if (hitCondition) {
        const match = hitCondition.match(/^(?<operator><=|<|>=|>|==|=|%)?\s*(?<number>\d+)$/u);
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
    catch {
    }

    return false;
  }
  private async printLogMessage(breakpoint: Breakpoint, logCategory?: LogCategory): Promise<void> {
    if (!this.currentMetaVariables) {
      throw Error(`This message shouldn't appear.`);
    }

    const { logMessage, logGroup, hitCount } = breakpoint;
    const metaVariables = new CaseInsensitiveMap<string, string>(this.currentMetaVariables.entries());
    metaVariables.set('hitCount', String(hitCount));

    for (const messageOrProperty of await this.formatLog(logMessage, metaVariables)) {
      let event: DebugProtocol.OutputEvent;
      if (typeof messageOrProperty === 'string') {
        const message = messageOrProperty;

        event = new OutputEvent(message, logCategory) as DebugProtocol.OutputEvent;
        if (logGroup) {
          event.body.group = logGroup as BreakpointLogGroup;
        }
      }
      else {
        const property = messageOrProperty;

        event = new OutputEvent(formatProperty(property, this.session!.ahkVersion), logCategory) as DebugProtocol.OutputEvent;
        event.body.variablesReference = this.logObjectsHandles.create(new Variable(this.session!, property));
      }

      if (this.currentStackFrames && 0 < this.currentStackFrames.length) {
        const { source, line } = this.currentStackFrames[0];
        event.body.source = source;
        event.body.line = line;
      }
      this.sendEvent(event);
    }
  }
  private async formatLog(format: string, metaVariables?: CaseInsensitiveMap<string, string>): Promise<Array<string | dbgp.ObjectProperty>> {
    const unescapeLogMessage = (string: string): string => {
      return string.replace(/\\([{}])/gu, '$1');
    };

    const variableRegex = /(?<!\\)\{(?<variableName>(?:\{?)?(?:\\\{|\\\}|[^{}\n])+?(?:\})?)(?<!\\)\}/gu;
    if (format.search(variableRegex) === -1) {
      return [ unescapeLogMessage(format) ];
    }

    const results: Array<string | dbgp.ObjectProperty> = [];
    let message = '', currentIndex = 0;
    for await (const match of format.matchAll(variableRegex)) {
      if (typeof match.index === 'undefined') {
        break;
      }
      if (typeof match.groups === 'undefined') {
        break;
      }

      if (currentIndex < match.index) {
        message += format.slice(currentIndex, match.index);
      }

      const { variableName } = match.groups;
      if (-1 < variableName.search(variableRegex)) {
        const metaVariableName = variableName.match(new RegExp(variableRegex.source, 'u'))?.groups?.variableName ?? '';
        if (metaVariables?.has(metaVariableName)) {
          message += metaVariables.get(metaVariableName)!;
        }
        else {
          message += match[0];
        }
      }
      else {
        const property = await this.session!.evaluate(variableName, undefined, 99);

        if (property) {
          if (property instanceof dbgp.ObjectProperty) {
            if (message !== '') {
              results.push(unescapeLogMessage(message));
              message = '';
            }

            results.push(property);
          }
          else if (property instanceof dbgp.PrimitiveProperty) {
            message += escapeAhk(property.value, this.session!.ahkVersion);
          }
        }
        else {
          message += match[0];
        }
      }

      currentIndex = match[0].length + match.index;
    }

    if (currentIndex < format.length) {
      message += format.slice(currentIndex);
    }
    results.push(unescapeLogMessage(message));

    // When output an object, it automatically breaks a line. Therefore, if the end is a newline code, remove it.
    if (1 < results.length) {
      const last = results[results.length - 1];
      const prevLast = results[results.length - 2];
      if (-1 < String(last).search(/^(\r\n|\r|\n)$/u) && prevLast instanceof dbgp.ObjectProperty) {
        results.pop();
      }
    }

    return results;
  }
  private async displayPerfTips(metaVarialbes: CaseInsensitiveMap<string, string>): Promise<void> {
    if (!this.config.usePerfTips) {
      return;
    }
    if (!this.currentStackFrames || this.currentStackFrames.length === 0) {
      return;
    }

    const { format } = this.config.usePerfTips;
    let message = '';
    for (const messageOrProperty of await this.formatLog(format, metaVarialbes)) {
      if (typeof messageOrProperty === 'string') {
        message += messageOrProperty;
      }
    }

    const decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        fontStyle: this.config.usePerfTips.fontStyle,
        color: this.config.usePerfTips.fontColor,
        contentText: ` ${message}`,
      },
    });
    this.perfTipsDecorationTypes.push(decorationType);

    const { source, line } = this.currentStackFrames[0];
    const document = await vscode.workspace.openTextDocument(source.path);
    let line_0base = line - 1;
    if (line_0base === document.lineCount) {
      line_0base--; // I don't know about the details, but if the script stops at the end of the file and it's not a blank line, then line_0base will be the value of `document.lineCount + 1`, so we'll compensate for that
    }

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
            this.session = new dbgp.Session(socket)
              .on('init', (initPacket: dbgp.InitPacket) => {
                if (typeof this.session === 'undefined') {
                  return;
                }

                completionItemProvider.useIntelliSenseInDebugging = this.config.useIntelliSenseInDebugging;
                completionItemProvider.session = this.session;
                this.ahkParser = createParser(this.session.ahkVersion);
                this.conditionalEvaluator = new ConditionalEvaluator(this.session);
                this.sendEvent(new InitializedEvent());
              })
              .on('warning', (warning: string) => {
                this.sendOutputEvent(`${warning}\n`);
              })
              .on('error', (error?: Error) => {
                if (error) {
                  this.sendOutputEvent(`Session closed for the following reasons: ${error.message}\n`, 'stderr');
                }

                this.sendEvent(new ThreadEvent('Session exited.', this.session!.id));
              })
              .on('close', () => {
                this.sendEvent(new ThreadEvent('Session exited.', this.session!.id));
              })
              .on('stdout', (data) => {
                this.ahkProcess!.event.emit('stdout', String(data));
              })
              .on('stderr', (data) => {
                this.ahkProcess!.event.emit('stderr', String(data));
              })
              .on('outputdebug', (data) => {
                this.ahkProcess!.event.emit('outputdebug', String(data));
              });

            this.breakpointManager = new BreakpointManager(this.session);
            this.variableManager = new VariableManager(this.session, this.config.variableCategories);
            this.sendEvent(new ThreadEvent('Session started.', this.session.id));
            resolve();
          }
          catch (error: unknown) {
            this.sendEvent(new ThreadEvent('Failed to start session.', this.session!.id));
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
