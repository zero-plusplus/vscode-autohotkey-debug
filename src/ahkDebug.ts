import * as path from 'path';
import * as net from 'net';
import { stat } from 'fs';
import {
  ChildProcessWithoutNullStreams,
  spawn,
} from 'child_process';
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
import { range } from 'underscore';
import { sync as pathExistsSync } from 'path-exists';
import * as isPortTaken from 'is-port-taken';
import AhkIncludeResolver from '@zero-plusplus/ahk-include-path-resolver';
import * as pidusage from 'pidusage';
import ByteConverter from '@wtfcode/byte-converter';
import {
  Breakpoint,
  BreakpointAdvancedData,
  BreakpointLogGroup,
  BreakpointManager,
} from './util/BreakpointManager';
import { CaseInsensitiveMap } from './util/CaseInsensitiveMap';
import { Parser, createParser } from './util/ConditionParser';
import { ConditionalEvaluator } from './util/ConditionEvaluator';
import { completionItemProvider } from './CompletionItemProvider';
import * as dbgp from './dbgpSession';
import { equalsIgnoreCase } from './util/stringUtils';

const byteConverter = new ByteConverter();
export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
  program: string;
  runtime: string;
  runtimeArgs: string[];
  args: string[];
  env: NodeJS.ProcessEnv;
  stopOnEntry: boolean;
  hostname: string;
  port: number;
  permittedPortRange: number[];
  maxChildren: number;
  useProcessUsageData: boolean;
  usePerfTips: false | {
    fontColor: string;
    fontStyle: string;
    format: string;
  };
  useDebugDirective: false | {
    useBreakpointDirective: boolean;
    useOutputDirective: boolean;
  };
  openFileOnExit: string;
}
type LogCategory = 'console' | 'stdout' | 'stderr';

export class AhkDebugSession extends LoggingDebugSession {
  private isPaused = false;
  private isSessionStopped = false;
  private server?: net.Server;
  private session?: dbgp.Session;
  private ahkProcess?: ChildProcessWithoutNullStreams;
  private ahkVersion!: 1 | 2;
  private ahkParser!: Parser;
  private config!: LaunchRequestArguments;
  private readonly contextByVariablesReference = new Map<number, dbgp.Context>();
  private stackFrameIdCounter = 1;
  private readonly stackFramesByFrameId = new Map<number, dbgp.StackFrame>();
  private variablesReferenceCounter = 1;
  private readonly objectPropertiesByVariablesReference = new Map<number, dbgp.ObjectProperty>();
  private readonly logObjectPropertiesByVariablesReference = new Map<number, dbgp.ObjectProperty>();
  private breakpointManager?: BreakpointManager;
  private conditionalEvaluator!: ConditionalEvaluator;
  private currentStackFrames: dbgp.StackFrame[] | null = null;
  private currentMetaVariables: CaseInsensitiveMap<string, string> | null = null;
  private metaVariablesWhenNotBreak: CaseInsensitiveMap<string, string> | null = null;
  private stackFramesWhenStepOut: dbgp.StackFrame[] | null = null;
  private stackFramesWhenStepOver: dbgp.StackFrame[] | null = null;
  private readonly perfTipsDecorationTypes: vscode.TextEditorDecorationType[] = [];
  private readonly loadedSources: string[] = [];
  constructor() {
    super('autohotkey-debug.txt');

    this.setDebuggerColumnsStartAt1(true);
    this.setDebuggerLinesStartAt1(true);
    this.setDebuggerPathFormat('uri');
  }
  protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
    response.body = {
      supportsConditionalBreakpoints: true,
      supportsConfigurationDoneRequest: true,
      supportsHitConditionalBreakpoints: true,
      supportsLoadedSourcesRequest: true,
      supportsLogPoints: true,
      supportsSetVariable: true,
    };

    this.sendResponse(response);
  }
  protected async disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request): Promise<void> {
    this.clearPerfTipsDecorations();

    if (this.session) {
      if (this.ahkProcess) {
        if (!this.isSessionStopped) {
          await this.session.sendStopCommand();
        }
      }
      await this.session.close();
    }
    if (this.server) {
      this.server.close();
    }

    if (this.config.openFileOnExit !== null) {
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
    this.config = args;

    if (!pathExistsSync(this.config.runtime)) {
      throw Error(`AutoHotkey runtime not found. Install AutoHotkey or specify the path of AutoHotkey.exe. Value of \`runtime\` in launch.json: \`${this.config.runtime}\``);
    }

    try {
      const runtimeArgs: string[] = [];
      if (!args.noDebug) {
        const portUsed = await isPortTaken(this.config.port, this.config.hostname);
        if (portUsed) {
          if (!await this.confirmWhetherUseAnotherPort(this.config.port)) {
            this.sendEvent(new TerminatedEvent());
            return;
          }
        }

        runtimeArgs.push(`/Debug=${String(args.hostname)}:${String(args.port)}`);
      }
      runtimeArgs.push(...this.config.runtimeArgs);
      runtimeArgs.push(`${args.program}`);
      runtimeArgs.push(...args.args);
      this.sendEvent(new OutputEvent(`${this.config.runtime} ${runtimeArgs.join(' ')}\n`, 'console'));
      const ahkProcess = spawn(
        this.config.runtime,
        runtimeArgs,
        {
          cwd: path.dirname(args.program),
          env: args.env,
        },
      );
      ahkProcess.on('close', (exitCode) => {
        this.isSessionStopped = true;
        const category = exitCode === 0 ? 'console' : 'stderr';
        this.sendEvent(new OutputEvent(`AutoHotkey closed for the following exit code: ${exitCode}\n`, category));
        this.sendEvent(new TerminatedEvent());
      });
      ahkProcess.stdout.on('data', (data: string | Buffer) => {
        const fixedData = this.fixPathOfRuntimeError(String(data));
        this.sendEvent(new OutputEvent(fixedData, 'stdout'));
      });
      ahkProcess.stderr.on('data', (data: Buffer) => {
        const fixedData = this.fixPathOfRuntimeError(String(data));
        this.sendEvent(new OutputEvent(fixedData, 'stderr'));
      });
      this.ahkProcess = ahkProcess;

      await new Promise((resolve, reject) => {
        this.server = net.createServer()
          .listen(args.port, args.hostname)
          .on('connection', (socket) => {
            try {
              this.session = new dbgp.Session(socket)
                .on('init', (initPacket: dbgp.InitPacket) => {
                  if (typeof this.session === 'undefined') {
                    return;
                  }
                  this.session.sendFeatureGetCommand('language_version').then((response) => {
                    this.ahkVersion = parseInt(response.value.charAt(0), 10) as 1 | 2;
                    completionItemProvider.ahkVersion = this.ahkVersion;
                    completionItemProvider.session = this.session ?? null;
                    this.ahkParser = createParser(this.ahkVersion);
                    this.conditionalEvaluator = new ConditionalEvaluator(this.session!, this.ahkVersion);

                    // Request breakpoints from VS Code
                    this.sendEvent(new InitializedEvent());
                  });
                })
                .on('warning', (warning: string) => {
                  this.sendEvent(new OutputEvent(`${warning}\n`));
                })
                .on('error', (error?: Error) => {
                  if (error) {
                    if (!this.isSessionStopped && this.ahkProcess) {
                      this.ahkProcess.kill();
                      this.isSessionStopped = true;
                    }
                    this.sendEvent(new OutputEvent(`Session closed for the following reasons: ${error.message}\n`));
                  }

                  this.sendEvent(new ThreadEvent('Session exited.', this.session!.id));
                })
                .on('close', () => {
                  this.isSessionStopped = true;
                  this.sendEvent(new ThreadEvent('Session exited.', this.session!.id));
                })
                .on('stdout', (data) => {
                  this.sendEvent(new OutputEvent(data, 'stdout'));
                })
                .on('stderr', (data) => {
                  const fixedData = this.fixPathOfRuntimeError(String(data));
                  this.sendEvent(new OutputEvent(fixedData, 'stderr'));
                });

              this.breakpointManager = new BreakpointManager(this.session);
              this.sendEvent(new ThreadEvent('Session started.', this.session.id));
              resolve();
            }
            catch (error) {
              this.sendEvent(new ThreadEvent('Failed to start session.', this.session!.id));
              reject(error);
            }
          });
      });
    }
    catch (error) {
      const message = {
        id: 2,
        format: error.message,
      } as DebugProtocol.Message;
      this.sendErrorResponse(response, message);
      this.sendEvent(new TerminatedEvent());
      return;
    }

    this.sendResponse(response);
  }
  protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): Promise<void> {
    const filePath = args.source.path ?? '';
    const fileUri = URI.file(filePath).toString();
    const requestedBreakpoints = args.breakpoints ?? [];

    await this.breakpointManager!.unregisterBreakpointsInFile(fileUri);

    const vscodeBreakpoints: DebugProtocol.Breakpoint[] = [];
    for await (const requestedBreakpoint of requestedBreakpoints) {
      const { condition, hitCondition } = requestedBreakpoint;
      const logMessage = requestedBreakpoint.logMessage ? `${requestedBreakpoint.logMessage}\n` : '';

      const advancedData = {
        condition,
        hitCondition,
        logMessage,
      } as BreakpointAdvancedData;
      try {
        const actualBreakpoint = await this.breakpointManager!.registerBreakpoint(fileUri, requestedBreakpoint.line, advancedData);
        if (actualBreakpoint.hidden) {
          continue;
        }

        vscodeBreakpoints.push({
          id: actualBreakpoint.id,
          line: actualBreakpoint.line,
          verified: true,
        });
      }
      catch (error) {
        vscodeBreakpoints.push({
          verified: false,
          message: error.message,
        });
      }
    }

    response.body = { breakpoints: vscodeBreakpoints };
    this.sendResponse(response);
  }
  protected async configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments, request?: DebugProtocol.Request): Promise<void> {
    this.sendResponse(response);
    await this.session!.sendFeatureSetCommand('max_children', this.config.maxChildren);
    await this.registerDebugDirective();

    if (this.config.stopOnEntry) {
      const result = await this.session!.sendContinuationCommand('step_into');
      this.checkContinuationStatus(result);
      return;
    }

    const result = await this.session!.sendContinuationCommand('run');
    this.checkContinuationStatus(result);
  }
  protected async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments, request?: DebugProtocol.Request): Promise<void> {
    this.sendResponse(response);
    this.isPaused = false;
    const result = await this.session!.sendContinuationCommand('run');
    this.checkContinuationStatus(result);
  }
  protected async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request): Promise<void> {
    this.sendResponse(response);

    this.isPaused = true;
    const result = await this.session!.sendContinuationCommand('step_over');
    this.checkContinuationStatus(result);
  }
  protected async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request): Promise<void> {
    this.sendResponse(response);

    this.isPaused = true;
    const result = await this.session!.sendContinuationCommand('step_into');
    this.checkContinuationStatus(result);
  }
  protected async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request): Promise<void> {
    this.sendResponse(response);

    this.isPaused = true;
    const result = await this.session!.sendContinuationCommand('step_out');
    this.checkContinuationStatus(result);
  }
  protected async pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments, request?: DebugProtocol.Request): Promise<void> {
    this.sendResponse(response);

    this.isPaused = true;
    const result = await this.session!.sendContinuationCommand('break');
    this.checkContinuationStatus(result);
  }
  protected threadsRequest(response: DebugProtocol.ThreadsResponse, request?: DebugProtocol.Request): void {
    response.body = { threads: [ new Thread(this.session!.id, 'Thread 1') ] };
    this.sendResponse(response);
  }
  protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request): void {
    const startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
    const maxLevels = typeof args.levels === 'number' ? args.levels : 1000;
    const endFrame = startFrame + maxLevels;

    const allStackFrames: dbgp.StackFrame[] = this.currentStackFrames!; // The most recent stack frame is always retrieved by checkContinuationStatus, which is executed immediately before, so you won't get a null.
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
    let properties: dbgp.Property[] = [];
    if (this.contextByVariablesReference.has(args.variablesReference)) {
      const context = this.contextByVariablesReference.get(args.variablesReference)!;
      properties = (await this.session!.sendContextGetCommand(context)).properties;
    }
    else if (this.objectPropertiesByVariablesReference.has(args.variablesReference)) {
      const objectProperty = this.objectPropertiesByVariablesReference.get(args.variablesReference)!;
      properties = objectProperty.children;
    }
    else if (this.logObjectPropertiesByVariablesReference.has(args.variablesReference)) {
      const objectProperty = this.logObjectPropertiesByVariablesReference.get(args.variablesReference);
      properties = [ objectProperty as dbgp.Property ];
    }

    const variables: DebugProtocol.Variable[] = [];
    for (const property of properties) {
      let variablesReference = 0, indexedVariables, namedVariables;

      if (args.filter) {
        if (args.filter === 'named' && property.isIndex) {
          continue;
        }
        if (args.filter === 'indexed') {
          if (!property.isIndex) {
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
          const { properties } = await this.session!.sendPropertyGetCommand(objectProperty.context, objectProperty.fullName);
          const property = properties[0];
          if (property instanceof dbgp.ObjectProperty) {
            objectProperty.children = property.children;
          }
        }

        const maxIndex = objectProperty.maxIndex;
        if (maxIndex !== null) {
          if (100 < maxIndex) {
            indexedVariables = maxIndex;
            namedVariables = 1;
          }
        }
      }

      variables.push({
        name: property.name,
        type: property.type,
        value: property.displayValue,
        variablesReference,
        indexedVariables,
        namedVariables,
      });
    }

    response.body = { variables };
    this.sendResponse(response);
  }
  protected async setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments, request?: DebugProtocol.Request): Promise<void> {
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
        else if (this.ahkVersion === 2 && number.type === 'Scientific') {
          typeName = 'float';
          data = `${String(parseFloat(number.value))}.0`;
        }
        else {
          if (this.ahkVersion === 2) {
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

      response.body = {
        type: typeName,
        variablesReference: 0,
        value: typeName === 'string' ? `"${data}"` : data,
      };
      this.sendResponse(response);
    }
    catch (error) {
      this.sendErrorResponse(response, {
        id: args.variablesReference,
        format: 'Command execution failed. This message is not normally displayed.',
      } as DebugProtocol.Message);
    }
  }
  protected async evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments, request?: DebugProtocol.Request): Promise<void> {
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
            variablesReference: 0,
          };
          this.sendResponse(response);
          return;
        }
        throw Error('not available');
      }

      const propertyNameParsed = this.ahkParser.PropertyName.parse(propertyName);
      if (!propertyNameParsed.status) {
        throw Error('Error: Only the property name or meta variable is supported. e.g. `prop`,` prop.field`, `prop[0]`, `prop["spaced key"]`, `prop.<base>`, `{metaVariableName}`');
      }
      const stackFrame = this.stackFramesByFrameId.get(args.frameId);
      if (!stackFrame) {
        throw Error('Error: Could not get stack frame');
      }

      const property = await this.session!.safeFetchLatestProperty(propertyName);
      if (property === null) {
        throw Error('not available');
      }

      let variablesReference = 0;
      if (property instanceof dbgp.ObjectProperty) {
        variablesReference = this.variablesReferenceCounter++;
        this.objectPropertiesByVariablesReference.set(variablesReference, property);
      }
      response.body = {
        result: property.displayValue,
        type: property.type,
        variablesReference,
      };
      this.sendResponse(response);
    }
    catch (error) {
      response.body = { result: error.message, variablesReference: 0 };
      this.sendResponse(response);
    }
  }
  protected sourceRequest(response: DebugProtocol.SourceResponse, args: DebugProtocol.SourceArguments, request?: DebugProtocol.Request): void {
    this.sendResponse(response);
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  protected async loadedSourcesRequest(response: DebugProtocol.LoadedSourcesResponse, args: DebugProtocol.LoadedSourcesArguments, request?: DebugProtocol.Request): Promise<void> {
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
  private async confirmWhetherUseAnotherPort(originalPort: number): Promise<boolean> {
    const portUsed = await isPortTaken(this.config.port, this.config.hostname);
    if (portUsed) {
      this.config.port++;
      return this.confirmWhetherUseAnotherPort(originalPort);
    }

    if (!this.config.permittedPortRange.includes(this.config.port)) {
      const message = `Port number \`${originalPort}\` is already in use. Would you like to start debugging using \`${this.config.port}\`?\n If you don't want to see this message, set a value for \`port\` of \`launch.json\`.`;
      const result = await vscode.window.showInformationMessage(message, { modal: true }, 'Yes');
      if (typeof result === 'undefined') {
        return false;
      }
    }

    return true;
  }
  private getAllLoadedSourcePath(): string[] {
    if (0 < this.loadedSources.length) {
      return this.loadedSources;
    }
    const resolver = new AhkIncludeResolver({
      rootPath: this.config.program,
      runtimePath: this.config.runtime,
      version: this.ahkVersion,
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
            hide: true,
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
      return `${fixed
        .replace(/\n(Specifically:)/u, '     $1')
        .substr(0, fixed.indexOf('Line#'))
        .replace(/\s+$/u, '')}\n`;
    }
    return errorMessage.replace(/^(.+)\s\((\d+)\)\s:/gmu, `$1:$2 :`);
  }
  private async checkContinuationStatus(response: dbgp.ContinuationResponse): Promise<void> {
    this.clearPerfTipsDecorations();

    if (response.status === 'stopped') {
      this.isSessionStopped = true;
    }
    else if (response.status === 'break') {
      const executionByUser = this.stackFramesWhenStepOver === null && this.stackFramesWhenStepOut === null;
      if (executionByUser && this.currentStackFrames) {
        if (response.commandName === 'step_out') {
          this.stackFramesWhenStepOut = this.currentStackFrames.slice(0);
        }
        else if (response.commandName === 'step_over') {
          this.stackFramesWhenStepOver = this.currentStackFrames.slice(0);
        }
      }

      const { stackFrames } = await this.session!.sendStackGetCommand();
      const { fileUri, line } = stackFrames[0];
      this.currentStackFrames = stackFrames;

      const conditionResults: boolean[] = [];

      const metaVariables = new CaseInsensitiveMap<string, string>();
      this.currentMetaVariables = metaVariables;
      metaVariables.set('hitCount', '-1');

      if (this.metaVariablesWhenNotBreak) {
        const elapsedTime_ns = parseFloat(this.metaVariablesWhenNotBreak.get('elapsedTime_ns')!) + response.elapsedTime.ns;
        const elapsedTime_ms = parseFloat(this.metaVariablesWhenNotBreak.get('elapsedTime_ms')!) + response.elapsedTime.ms;
        const elapsedTime_s = parseFloat(this.metaVariablesWhenNotBreak.get('elapsedTime_s')!) + response.elapsedTime.s;
        metaVariables.set('elapsedTime_ns', String(elapsedTime_ns).slice(0, 10));
        metaVariables.set('elapsedTime_ms', String(elapsedTime_ms).slice(0, 10));
        metaVariables.set('elapsedTime_s', String(elapsedTime_s.toFixed(8)).slice(0, 10));
      }
      else {
        metaVariables.set('elapsedTime_ns', String(response.elapsedTime.ns).slice(0, 10));
        metaVariables.set('elapsedTime_ms', String(response.elapsedTime.ms).slice(0, 10));
        metaVariables.set('elapsedTime_s', String(response.elapsedTime.s.toFixed(8)).slice(0, 10));
      }
      if (this.config.useProcessUsageData) {
        const usage = await pidusage(this.ahkProcess!.pid);
        metaVariables.set('usageCpu', String(usage.cpu));
        metaVariables.set('usageMemory_B', String(usage.memory));
        metaVariables.set('usageMemory_MB', String(byteConverter.convert(usage.memory, 'B', 'MB')));
      }

      if (this.isPaused && !this.breakpointManager!.isAdvancedBreakpoint(fileUri, line)) {
        this.sendStoppedEvent(response.stopReason, metaVariables);
        return;
      }

      let stopReason = String(response.stopReason);
      const lineBreakpoints = this.breakpointManager!.getBreakpoints(fileUri, line);
      if (lineBreakpoints) {
        lineBreakpoints.hitCount++;
        metaVariables.set('hitCount', String(lineBreakpoints.hitCount));

        for await (const breakpoint of lineBreakpoints) {
          const _metaVariables = new CaseInsensitiveMap<string, string>(metaVariables.entries());

          const {
            condition,
            hitCondition,
            logGroup,
            logMessage,
          } = breakpoint;

          _metaVariables.set('condition', condition);
          _metaVariables.set('hitCondition', hitCondition);
          _metaVariables.set('logMessage', logMessage);
          _metaVariables.set('logGroup', logGroup);

          let conditionResult = true;
          if (condition || hitCondition) {
            conditionResult = await this.evalCondition(breakpoint, _metaVariables);
            if (conditionResult) {
              if (!(breakpoint.hidden || conditionResults.includes(true))) {
                stopReason = 'conditional breakpoint';
              }
            }
          }

          const logMode = logGroup || logMessage;
          if (conditionResult && logMode) {
            const logCategory = 'stderr' as LogCategory;
            await this.printLogMessage(_metaVariables, logCategory);
            conditionResult = false;
          }

          conditionResults.push(conditionResult);
        }
      }

      let stop = conditionResults.includes(true);
      if (this.stackFramesWhenStepOut && this.currentStackFrames.length < this.stackFramesWhenStepOut.length) {
        this.stackFramesWhenStepOut = null;
        stop = true;
      }
      else if (this.stackFramesWhenStepOver && this.stackFramesWhenStepOver.length === this.currentStackFrames.length) {
        stop = true;
      }
      else if ([ 'step_into', 'break' ].includes(response.commandName)) {
        stop = true;
      }

      let stepOverExecute = false, stepOutExecute = false;
      if (this.stackFramesWhenStepOver && this.stackFramesWhenStepOver[0].line === this.currentStackFrames[0].line) {
        this.stackFramesWhenStepOver = null;
        stop = false;
        stepOverExecute = true;
      }
      else if (this.stackFramesWhenStepOut && this.stackFramesWhenStepOut.length === 1) {
        if (this.stackFramesWhenStepOut[0].line === this.currentStackFrames[0].line) {
          this.stackFramesWhenStepOut = null;
          stop = false;
          stepOutExecute = true;
        }
      }

      if (stop) {
        this.sendStoppedEvent(stopReason, metaVariables);
        return;
      }

      this.metaVariablesWhenNotBreak = metaVariables;

      let result: dbgp.ContinuationResponse;
      if (stepOverExecute) {
        result = await this.session!.sendContinuationCommand('step_over');
      }
      else if (stepOutExecute) {
        result = await this.session!.sendContinuationCommand('step_out');
      }
      else if (this.stackFramesWhenStepOut || this.stackFramesWhenStepOver) {
        result = await this.session!.sendContinuationCommand('step_out');
      }
      else if (this.isPaused) {
        result = await this.session!.sendContinuationCommand('break');
      }
      else {
        result = await this.session!.sendContinuationCommand('run');
      }
      await this.checkContinuationStatus(result);
    }
  }
  private sendStoppedEvent(stopReason: string, metaVariables: CaseInsensitiveMap<string, string>): void {
    this.metaVariablesWhenNotBreak = null;
    this.stackFramesWhenStepOut = null;
    this.stackFramesWhenStepOver = null;
    this.sendEvent(new StoppedEvent(stopReason, this.session!.id));
    this.displayPerfTips(metaVariables);
  }
  private async evalCondition(breakpoint: Breakpoint, metaVariables: CaseInsensitiveMap<string, string>): Promise<boolean> {
    const { condition, hitCondition } = breakpoint;
    const hitCount = parseInt(metaVariables.get('hitCount')!, 10);

    let conditionResult = false, hitConditionResult = false;
    if (condition) {
      conditionResult = await this.conditionalEvaluator.eval(condition, metaVariables);
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
  private async printLogMessage(metaVariables: CaseInsensitiveMap<string, string>, logCategory?: LogCategory): Promise<void> {
    const logMessage = metaVariables.get('logMessage') ?? '';
    const results = await this.formatLog(logMessage, metaVariables);

    // When output an object, it automatically breaks a line. Therefore, if the end is a newline code, remove it.
    const last = results[results.length - 1];
    const prevLast = results[results.length - 2];
    if (-1 < String(last).search(/^(\r\n|\r|\n)$/u) && prevLast instanceof dbgp.ObjectProperty) {
      results.pop();
    }

    for (const messageOrProperty of results) {
      let event: DebugProtocol.OutputEvent;
      if (typeof messageOrProperty === 'string') {
        const message = messageOrProperty;

        event = new OutputEvent(message, logCategory) as DebugProtocol.OutputEvent;
        if (metaVariables.has('logGroup')) {
          event.body.group = metaVariables.get('logGroup')! as BreakpointLogGroup;
        }
      }
      else {
        const property = messageOrProperty;
        const variablesReference = this.variablesReferenceCounter++;
        this.logObjectPropertiesByVariablesReference.set(variablesReference, property);

        event = new OutputEvent(property.displayValue, logCategory) as DebugProtocol.OutputEvent;
        event.body.variablesReference = variablesReference;
      }

      if (this.currentStackFrames) {
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
      return [ format ];
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
        const property = await this.session!.safeFetchLatestProperty(variableName);

        if (property) {
          if (property instanceof dbgp.ObjectProperty) {
            if (message !== '') {
              results.push(unescapeLogMessage(message));
              message = '';
            }

            results.push(property);
          }
          else if (property instanceof dbgp.PrimitiveProperty) {
            message += property.value;
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
    return results;
  }
  private async displayPerfTips(metaVarialbes: CaseInsensitiveMap<string, string>): Promise<void> {
    if (!this.config.usePerfTips) {
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

    if (!this.currentStackFrames) {
      return;
    }

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
    editor.setDecorations(decorationType, [ decoration ]);
  }
  private clearPerfTipsDecorations(): void {
    if (!this.config.usePerfTips) {
      return;
    }

    for (const editor of vscode.window.visibleTextEditors) {
      for (const decorationTypes of this.perfTipsDecorationTypes) {
        editor.setDecorations(decorationTypes, []);
      }
    }
  }
}
