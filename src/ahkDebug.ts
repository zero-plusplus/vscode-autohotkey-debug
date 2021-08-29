import * as path from 'path';
import * as net from 'net';
import { stat } from 'fs';


import * as vscode from 'vscode';
import {
  InitializedEvent,
  LoggingDebugSession,
  OutputEvent,
  Scope,
  StackFrame,
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
import { rtrim } from 'underscore.string';
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
import { AutoHotkeyLauncher, AutoHotkeyScriptHandler } from './util/AutoHotkeyLuncher';
import { timeoutPromise } from './util/util';

export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
  program: string;
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
  };
  useAutoJumpToError: boolean;
  useUIAVersion: boolean;
  openFileOnExit: string;
  trace: boolean;
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
  private autoExecutingOnAdvancedBreakpoint = false;
  private pauseRequested = false;
  private isPaused = false;
  private isTerminateRequested = false;
  private server?: net.Server;
  private session?: dbgp.Session;
  private scriptHandler?: AutoHotkeyScriptHandler;
  private ahkParser!: Parser;
  private config!: LaunchRequestArguments;
  private readonly contextByVariablesReference = new Map<number, dbgp.Context>();
  private stackFrameIdCounter = 1;
  private readonly stackFramesByFrameId = new Map<number, dbgp.StackFrame>();
  private variablesReferenceCounter = 1;
  private readonly objectPropertiesByVariablesReference = new Map<number, dbgp.ObjectProperty>();
  private readonly logObjectPropertiesByVariablesReference = new Map<number, dbgp.ObjectProperty>();
  private breakpointManager?: BreakpointManager;
  private readonly settingBreakpointPending: Array<Promise<void>> = [];
  private conditionalEvaluator!: ConditionalEvaluator;
  private prevStackFrames: dbgp.StackFrame[] | null = null;
  private currentStackFrames: dbgp.StackFrame[] = [];
  private currentMetaVariables: CaseInsensitiveMap<string, string> | null = null;
  private stackFramesWhenStepOut: dbgp.StackFrame[] | null = null;
  private stackFramesWhenStepOver: dbgp.StackFrame[] | null = null;
  private readonly perfTipsDecorationTypes: vscode.TextEditorDecorationType[] = [];
  private readonly loadedSources: string[] = [];
  private errorMessage = '';
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
    };

    this.sendResponse(response);
  }
  protected async disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('disconnectRequest');
    this.isTerminateRequested = true;
    this.clearPerfTipsDecorations();

    if (this.session?.socketWritable) {
      await timeoutPromise(this.session.sendStopCommand(), 500);
    }
    await this.session?.close();
    this.server?.close();

    let jumpToError = false;
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

        jumpToError = true;
      }
    }
    if (!jumpToError && this.config.openFileOnExit) {
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

    this.sendResponse(response);
    this.shutdown();
  }
  protected async launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): Promise<void> {
    this.traceLogger.enable = args.trace;
    this.traceLogger.log('launchRequest');
    this.config = args;

    try {
      this.scriptHandler = new AutoHotkeyLauncher(this.config).launch();
      this.scriptHandler.event
        .on('close', (exitCode?: number) => {
          if (this.isTerminateRequested) {
            return;
          }

          if (exitCode) {
            const category = exitCode === 0 ? 'console' : 'stderr';
            this.sendEvent(new OutputEvent(`AutoHotkey closed for the following exit code: ${exitCode}\n`, category));
          }
          this.sendTerminateEvent();
        })
        .on('stdout', (message: string) => {
          const fixedData = this.fixPathOfRuntimeError(message);
          this.sendEvent(new OutputEvent(fixedData, 'stdout'));
        })
        .on('stderr', (message: string) => {
          const fixedData = this.fixPathOfRuntimeError(String(message));
          this.errorMessage = fixedData;
          this.sendEvent(new OutputEvent(fixedData, 'stderr'));
        });
      this.sendEvent(new OutputEvent(`${this.scriptHandler.command}`, 'console'));

      await new Promise<void>((resolve, reject) => {
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
                  this.sendEvent(new OutputEvent(`${warning}\n`));
                })
                .on('error', (error?: Error) => {
                  if (error) {
                    this.sendEvent(new OutputEvent(`Session closed for the following reasons: ${error.message}\n`));
                  }

                  this.sendEvent(new ThreadEvent('Session exited.', this.session!.id));
                })
                .on('close', () => {
                  this.sendEvent(new ThreadEvent('Session exited.', this.session!.id));
                })
                .on('stdout', (data) => {
                  this.scriptHandler!.event.emit('stdout', String(data));
                })
                .on('stderr', (data) => {
                  this.scriptHandler!.event.emit('stderr', String(data));
                });

              this.breakpointManager = new BreakpointManager(this.session);
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
    catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'User will never see this message.';
      this.sendErrorResponse(response, { id: 2, format: errorMessage });
      this.sendTerminateEvent();
      return;
    }

    this.sendResponse(response);
  }
  protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): Promise<void> {
    this.settingBreakpointPending.push((async(): Promise<void> => {
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
    })());

    await serializePromise(this.settingBreakpointPending);
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

    if (this.autoExecutingOnAdvancedBreakpoint) {
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
  protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request): void {
    this.traceLogger.log('stackTraceRequest');
    if (this.session!.socketClosed || this.isTerminateRequested) {
      this.sendResponse(response);
      return;
    }

    const startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
    const maxLevels = typeof args.levels === 'number' ? args.levels : 1000;
    const endFrame = startFrame + maxLevels;

    const allStackFrames = this.currentStackFrames;
    const stackFrames = allStackFrames.slice(startFrame, endFrame);

    if (0 < stackFrames.length) {
      response.body = {
        totalFrames: allStackFrames.length,
        stackFrames: stackFrames.map((stackFrame) => {
          const id = this.stackFrameIdCounter++;
          const filePath = URI.parse(stackFrame.fileUri).fsPath;
          const source = {
            name: path.basename(filePath),
            path: filePath,
          } as DebugProtocol.Source;

          this.stackFramesByFrameId.set(id, stackFrame);
          return {
            id,
            source,
            name: stackFrame.name,
            line: stackFrame.line,
            column: 1,
          } as StackFrame;
        }),
      };
    }
    else {
      const stackFrame = {
        name: 'Idling (Click me if you want to see the variables)',
        fileUri: '',
        level: 0,
        line: -1,
        type: 'file',
      } as dbgp.StackFrame;
      const id = this.stackFrameIdCounter++;

      this.stackFramesByFrameId.set(id, stackFrame);
      response.body = {
        totalFrames: 1,
        stackFrames: [
          {
            id,
            name: stackFrame.name,
          } as StackFrame,
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

    const stackFrame = this.stackFramesByFrameId.get(args.frameId);
    if (typeof stackFrame === 'undefined') {
      throw new Error(`Unknown frameId ${args.frameId}`);
    }
    const { contexts } = await this.session!.sendContextNamesCommand(stackFrame);

    response.body = {
      scopes: contexts.map((context) => {
        const variableReference = this.variablesReferenceCounter++;

        this.contextByVariablesReference.set(variableReference, context);
        return new Scope(context.name, variableReference);
      }),
    };

    this.sendResponse(response);
  }
  protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request): Promise<void> {
    this.traceLogger.log('variablesRequest');
    if (this.logObjectPropertiesByVariablesReference.has(args.variablesReference)) {
      const objectProperty = this.logObjectPropertiesByVariablesReference.get(args.variablesReference);
      if (objectProperty) {
        const variablesReference = this.variablesReferenceCounter++;
        this.objectPropertiesByVariablesReference.set(variablesReference, objectProperty);

        let indexedVariables, namedVariables;
        if (objectProperty.isArray) {
          const maxIndex = objectProperty.maxIndex!;
          if (100 < maxIndex) {
            indexedVariables = maxIndex;
            namedVariables = 1;
          }
        }
        const variable = {
          name: objectProperty.name,
          value: this.formatProperty(objectProperty),
          variablesReference,
          indexedVariables,
          namedVariables,
        } as DebugProtocol.Variable;
        response.body = { variables: [ variable ] };
      }
      this.sendResponse(response);
      return;
    }

    if (this.session!.socketClosed || this.isTerminateRequested) {
      this.sendResponse(response);
      return;
    }

    let properties: dbgp.Property[] = [];
    if (this.contextByVariablesReference.has(args.variablesReference)) {
      const context = this.contextByVariablesReference.get(args.variablesReference)!;
      properties = (await this.session!.sendContextGetCommand(context)).properties;
    }
    else if (this.objectPropertiesByVariablesReference.has(args.variablesReference)) {
      const objectProperty = this.objectPropertiesByVariablesReference.get(args.variablesReference)!;
      properties = objectProperty.children;
    }

    const variables: DebugProtocol.Variable[] = [];
    for (const property of properties) {
      let variablesReference = 0, indexedVariables, namedVariables;

      if (args.filter) {
        if (args.filter === 'named' && property.isIndexKey) {
          continue;
        }
        if (args.filter === 'indexed') {
          if (!property.isIndexKey) {
            continue;
          }
          const index = property.index!;
          const start = args.start! + 1;
          const end = args.start! + args.count!;
          const contains = start <= index && index <= end;
          if (!contains) {
            continue;
          }
        }
      }

      if (property instanceof dbgp.ObjectProperty) {
        const objectProperty = property;

        variablesReference = this.variablesReferenceCounter++;
        this.objectPropertiesByVariablesReference.set(variablesReference, objectProperty);

        const loadedChildren = objectProperty.hasChildren && 0 < objectProperty.children.length;
        if (!loadedChildren) {
          // eslint-disable-next-line no-await-in-loop
          const property = await this.session!.fetchProperty(objectProperty.context, objectProperty.fullName);
          if (property instanceof dbgp.ObjectProperty) {
            objectProperty.isArray = property.isArray;
            objectProperty.children = property.children;
          }
        }

        if (objectProperty.isArray) {
          const maxIndex = objectProperty.maxIndex!;
          if (100 < maxIndex) {
            indexedVariables = maxIndex;
            namedVariables = 1;
          }
        }
      }

      variables.push({
        name: property.name,
        type: property.type,
        value: this.formatProperty(property),
        variablesReference,
        indexedVariables,
        namedVariables,
      });
    }

    response.body = { variables };
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
    if (this.objectPropertiesByVariablesReference.has(args.variablesReference)) {
      const objectProperty = this.objectPropertiesByVariablesReference.get(args.variablesReference)!;
      const name = args.name.startsWith('[') ? args.name : `.${args.name}`;
      fullName = `${objectProperty.fullName}${name}`;
      context = objectProperty.context;
    }
    else {
      context = this.contextByVariablesReference.get(args.variablesReference)!;
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
        value: this.formatProperty(properties[0]),
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

      const propertyName = args.expression;
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
        const stackFrame = this.stackFramesByFrameId.get(args.frameId);
        if (!stackFrame) {
          throw Error('Error: Could not get stack frame');
        }

        const property = await this.session!.evaluate(propertyName);
        if (property === null) {
          throw Error('not available');
        }

        let variablesReference = 0, indexedVariables, namedVariables;
        if (property instanceof dbgp.ObjectProperty) {
          variablesReference = this.variablesReferenceCounter++;
          this.objectPropertiesByVariablesReference.set(variablesReference, property);

          if (property.isArray) {
            const maxIndex = property.maxIndex!;
            if (100 < maxIndex) {
              indexedVariables = maxIndex;
              namedVariables = 1;
            }
          }
        }

        response.body = {
          result: this.formatProperty(property),
          type: property.type,
          variablesReference,
          indexedVariables,
          namedVariables,
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
      }));
    }));
    // const DEBUG_hrtime = process.hrtime(DEBUG_start);
    // // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    // // eslint-disable-next-line no-mixed-operators
    // const DEBUG_ns = DEBUG_hrtime[0] * 1e9 + DEBUG_hrtime[1];
    // const DEBUG_s = DEBUG_ns / 1e9;
    // this.printLogMessage(`elapsedTime: ${DEBUG_s}s`);
  }
  private escapeDebuggerToClient(str: string): string {
    const version = this.session!.ahkVersion;
    return str
      .replace(/"/gu, version.mejor === 1 ? '""' : '`"')
      .replace(/\r\n/gu, '`r`n')
      .replace(/\n/gu, '`n')
      .replace(/\r/gu, '`r')
      .replace(/[\b]/gu, '`b')
      .replace(/\t/gu, '`t')
      .replace(/\v/gu, '`v')
      // eslint-disable-next-line no-control-regex
      .replace(/[\x07]/gu, '`a')
      .replace(/\f/gu, '`f');
  }
  private formatProperty(property: dbgp.Property): string {
    const formatPrimitiveProperty = (property: dbgp.PrimitiveProperty): string => {
      if (property.type === 'string') {
        return `"${this.escapeDebuggerToClient(property.value)}"`;
      }
      else if (property.type === 'undefined') {
        return 'Not initialized';
      }
      return property.value;
    };

    if (property instanceof dbgp.PrimitiveProperty) {
      return formatPrimitiveProperty(property);
    }

    const objectProperty = property as dbgp.ObjectProperty;
    const maxIndex = objectProperty.maxIndex;
    const isArray = objectProperty.isArray;
    let value = isArray
      ? `${objectProperty.className}(${maxIndex!}) [`
      : `${objectProperty.className} {`;

    const children = objectProperty.children.slice(0, 100);
    for (const child of children) {
      if (child.name === 'base') {
        continue;
      }

      const displayValue = child instanceof dbgp.PrimitiveProperty
        ? formatPrimitiveProperty(child)
        : (child as dbgp.ObjectProperty).className;

      const objectChild = child as dbgp.ObjectProperty;
      if (objectProperty.isArray) {
        if (!objectChild.isIndexKey) {
          continue;
        }

        value += `${displayValue}, `;
        continue;
      }

      const key = objectChild.isIndexKey
        ? String(objectChild.index)
        : objectChild.name;
      value += `${key}: ${displayValue}, `;
    }

    if (children.length === 100) {
      value += '…';
    }

    value = rtrim(value, ', ');
    value += isArray ? ']' : '}';
    return value;
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
    const { stackFrames } = await this.session!.sendStackGetCommand();

    const isScriptIdling = stackFrames.length === 0;
    if (isScriptIdling) {
      this.currentStackFrames = [];
      await this.sendStoppedEvent('pause');
      return;
    }

    const { fileUri, line } = stackFrames[0];
    this.currentStackFrames = stackFrames;
    const lineBreakpoints = this.breakpointManager!.getLineBreakpoints(fileUri, line);
    let stopReason: StopReason = 'step';
    if (lineBreakpoints) {
      lineBreakpoints.incrementHitCount();
      if (0 < lineBreakpoints.length) {
        stopReason = lineBreakpoints[0].hidden
          ? 'hidden breakpoint'
          : 'breakpoint';
      }
    }

    // Pause
    if (response.commandName === 'break') {
      this.currentMetaVariables.set('elapsedTime_ns', '-1');
      this.currentMetaVariables.set('elapsedTime_ms', '-1');
      this.currentMetaVariables.set('elapsedTime_s', '-1');
      await this.processLogpoint(lineBreakpoints);
      await this.sendStoppedEvent('pause');
      return;
    }

    // Paused on step
    if (response.commandName.includes('step')) {
      await this.processStepExecution(response.commandName as dbgp.StepCommandName, lineBreakpoints);
      return;
    }

    // Paused on breakpoint
    await this.processLogpoint(lineBreakpoints);
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
    this.autoExecutingOnAdvancedBreakpoint = true;
    const result = await this.session!.sendRunCommand();
    await this.checkContinuationStatus(result);
  }
  private async processStepExecution(stepType: dbgp.StepCommandName, lineBreakpoints: LineBreakpoints | null): Promise<void> {
    if (!this.currentMetaVariables || this.currentStackFrames.length === 0) {
      throw Error(`This message shouldn't appear.`);
    }

    // Fix a bug that prevented AutoExec thread, Timer thread, from getting proper information when there was more than one call stack
    const prevStackFrames: dbgp.StackFrame[] | undefined = this.prevStackFrames?.slice();
    const currentStackFrames = this.currentStackFrames.slice();
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
      await this.processLogpoint(lineBreakpoints);
    }

    // step_into is always stop
    if (stepType === 'step_into') {
      await this.sendStoppedEvent(stopReason);
      return;
    }

    const executeByUser = this.stackFramesWhenStepOut === null && this.stackFramesWhenStepOver === null;
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
    this.autoExecutingOnAdvancedBreakpoint = true;
    if (this.stackFramesWhenStepOut) {
      // If go back to the same line in a loop
      if (prevStackFrames && equalsIgnoreCase(currentStackFrames[0].fileUri, prevStackFrames[0].fileUri) && currentStackFrames[0].line === prevStackFrames[0].line) {
        if (matchedBreakpoint) {
          await this.sendStoppedEvent(stopReason);
          return;
        }
      }
      else if (equalsIgnoreCase(this.stackFramesWhenStepOut[0].fileUri, currentStackFrames[0].fileUri) && this.stackFramesWhenStepOut[0].line === currentStackFrames[0].line) {
        // One more breath. The final adjustment
        const result = await this.session!.sendContinuationCommand('step_out');
        await this.checkContinuationStatus(result);
        return;
      }

      // Complated step out
      if (this.currentStackFrames.length < this.stackFramesWhenStepOut.length) {
        await this.sendStoppedEvent(stopReason);
        return;
      }
    }
    else if (this.stackFramesWhenStepOver) {
      // If go back to the same line in a loop
      if (this.stackFramesWhenStepOver.length === currentStackFrames.length) {
        if (prevStackFrames && equalsIgnoreCase(currentStackFrames[0].fileUri, prevStackFrames[0].fileUri) && currentStackFrames[0].line === prevStackFrames[0].line) {
          await this.sendStoppedEvent(stopReason);
          return;
        }
      }

      // One more breath. The final adjustment
      if (equalsIgnoreCase(this.stackFramesWhenStepOver[0].fileUri, currentStackFrames[0].fileUri) && this.stackFramesWhenStepOver[0].line === currentStackFrames[0].line) {
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
  private async processLogpoint(lineBreakpoints: LineBreakpoints | null): Promise<void> {
    if (this.currentStackFrames.length === 0) {
      throw Error(`This message shouldn't appear.`);
    }
    if (!lineBreakpoints) {
      return;
    }
    if (!lineBreakpoints.hasAdvancedBreakpoint()) {
      return;
    }

    for await (const breakpoint of lineBreakpoints) {
      if (breakpoint.kind.includes('logpoint')) {
        if (breakpoint.kind === 'conditional logpoint' && !await this.evalCondition(breakpoint)) {
          continue;
        }
        await this.printLogMessage(breakpoint, 'stdout');
      }
    }
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

    this.stackFramesWhenStepOut = null;
    this.stackFramesWhenStepOver = null;
    this.pauseRequested = false;
    this.isPaused = true;
    this.autoExecutingOnAdvancedBreakpoint = false;

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
        const variablesReference = this.variablesReferenceCounter++;
        this.logObjectPropertiesByVariablesReference.set(variablesReference, property);

        event = new OutputEvent(this.formatProperty(property), logCategory) as DebugProtocol.OutputEvent;
        event.body.variablesReference = variablesReference;
      }

      if (0 < this.currentStackFrames.length) {
        const { fileUri, line } = this.currentStackFrames[0];
        event.body.source = { path: fileUri };
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
        const property = await this.session!.evaluate(variableName);

        if (property) {
          if (property instanceof dbgp.ObjectProperty) {
            if (message !== '') {
              results.push(unescapeLogMessage(message));
              message = '';
            }

            results.push(property);
          }
          else if (property instanceof dbgp.PrimitiveProperty) {
            message += this.escapeDebuggerToClient(property.value);
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
    if (this.currentStackFrames.length === 0) {
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

    const { fileUri, line } = this.currentStackFrames[0];
    const document = await vscode.workspace.openTextDocument(URI.parse(fileUri).fsPath);
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
}
