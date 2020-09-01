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
import { sync as pathExistsSync } from 'path-exists';
import * as isPortTaken from 'is-port-taken';
import AhkIncludeResolver from '@zero-plusplus/ahk-include-path-resolver';
import * as pidusage from 'pidusage';
import ByteConverter from '@wtfcode/byte-converter';
import { CaseInsensitiveMap } from './util/CaseInsensitiveMap';
import { Parser, createParser } from './util/ConditionParser';
import { ConditionalEvaluator } from './util/ConditionEvaluator';
import * as dbgp from './dbgpSession';

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
  useAdvancedBreakpoint: boolean;
  useProcessUsageData: boolean;
  usePerfTips: false | {
    fontColor: string;
    fontStyle: string;
    format: string;
  };
  openFileOnExit: string;
}
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
  private readonly breakpoints: { [key: string]: dbgp.Breakpoint | undefined} = {};
  private conditionalEvaluator!: ConditionalEvaluator;
  private currentStackFrames: dbgp.StackFrame[] | null = null;
  private currentMetaVariables: CaseInsensitiveMap<string, string> | null = null;
  private metaVariablesWhenNotBreak: CaseInsensitiveMap<string, string> | null = null;
  private readonly perfTipsDecorationTypes: vscode.TextEditorDecorationType[] = [];
  constructor() {
    super('autohotkey-debug.txt');

    this.setDebuggerColumnsStartAt1(true);
    this.setDebuggerLinesStartAt1(true);
    this.setDebuggerPathFormat('uri');
  }
  public convertClientPathToDebugger(filePath: string): string {
    const fileUri = super.convertClientPathToDebugger(filePath).replace('file:///', '');
    const isUnc = path.parse(fileUri).root === '';
    if (isUnc) {
      return `\\\\${fileUri}`;
    }
    return fileUri;
  }
  public convertDebuggerPathToClient(fileUri: string): string {
    const filePath = super.convertDebuggerPathToClient(fileUri);

    const isUnc = filePath.startsWith('\\');
    if (isUnc) {
      return `\\${filePath}`;
    }
    return filePath;
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

    const portUsed = await isPortTaken(this.config.port, this.config.hostname);
    if (portUsed) {
      if (!await this.confirmWhetherUseAnotherPort(this.config.port)) {
        this.sendEvent(new TerminatedEvent());
        return;
      }
    }

    try {
      const runtimeArgs = [ ...this.config.runtimeArgs, `/Debug=${String(args.hostname)}:${String(args.port)}`, `${args.program}`, ...args.args ];
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

            this.sendEvent(new ThreadEvent('Session started.', this.session.id));
          }
          catch (error) {
            this.sendEvent(new ThreadEvent('Failed to start session.', this.session!.id));
            this.sendEvent(new TerminatedEvent());
          }
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
    const dbgpBreakpoint = (await this.session!.sendBreakpointListCommand()).breakpoints;

    // Clear dbgp breakpoints from current file
    await Promise.all(dbgpBreakpoint
      .filter((dbgpBreakpoint) => {
        // (breakpoint.fileUri === fileUri) is not Equals.
        // breakpoint.fileUri: file:///W%3A/project/vscode-autohotkey-debug/demo/demo.ahk"
        // fileUri:            file:///w:/project/vscode-autohotkey-debug/demo/demo.ahk
        const _filePath = this.convertDebuggerPathToClient(dbgpBreakpoint.fileUri);
        if (filePath.toLowerCase() === _filePath.toLowerCase()) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete this.breakpoints[`${filePath.toLowerCase()}${dbgpBreakpoint.line}`];
          return true;
        }
        return false;
      })
      .map(async(dbgpBreakpoint) => {
        return this.session!.sendBreakpointRemoveCommand(dbgpBreakpoint);
      }));

    const vscodeBreakpoints: DebugProtocol.Breakpoint[] = [];
    if (args.breakpoints) {
      await Promise.all(args.breakpoints
        .map(async(vscodeBreakpoint, index) => {
          try {
            const { id } = await this.session!.sendBreakpointSetCommand(this.convertClientPathToDebugger(filePath), vscodeBreakpoint.line);
            const { fileUri, line } = await this.session!.sendBreakpointGetCommand(id);

            const dbgpBreakpoint = this.breakpoints[`${filePath}${line}`];
            if (dbgpBreakpoint?.advancedData) {
              dbgpBreakpoint.advancedData.condition = vscodeBreakpoint.condition;
              dbgpBreakpoint.advancedData.hitCondition = vscodeBreakpoint.hitCondition;
              dbgpBreakpoint.advancedData.logMessage = vscodeBreakpoint.logMessage;
            }
            else {
              this.breakpoints[`${filePath.toLowerCase()}${line}`] = new dbgp.Breakpoint(fileUri, line, {
                counter: 0,
                condition: vscodeBreakpoint.condition,
                hitCondition: vscodeBreakpoint.hitCondition,
                logMessage: vscodeBreakpoint.logMessage,
              });
            }

            vscodeBreakpoints[index] = {
              id,
              line,
              verified: true,
            };
          }
          catch (error) {
            vscodeBreakpoints[index] = {
              verified: false,
              message: error.message,
            };
          }
        }));
    }

    response.body = { breakpoints: vscodeBreakpoints };
    this.sendResponse(response);
  }
  protected async configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments, request?: DebugProtocol.Request): Promise<void> {
    this.sendResponse(response);
    await this.session!.sendFeatureSetCommand('max_children', this.config.maxChildren);

    if (this.config.stopOnEntry) {
      const result = await this.session!.sendContinuationCommand('step_into');
      this.checkContinuationStatus(result);
      return;
    }

    const result = await this.session!.sendContinuationCommand('run');
    if (this.config.useAdvancedBreakpoint) {
      this.checkContinuationStatus(result, !this.config.stopOnEntry);
      return;
    }
    this.checkContinuationStatus(result);
  }
  protected async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments, request?: DebugProtocol.Request): Promise<void> {
    this.sendResponse(response);
    this.isPaused = false;
    const result = await this.session!.sendContinuationCommand('run');
    this.checkContinuationStatus(result, this.config.useAdvancedBreakpoint);
  }
  protected async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request): Promise<void> {
    this.sendResponse(response);

    this.isPaused = true;
    const result = await this.session!.sendContinuationCommand('step_over');
    this.checkContinuationStatus(result, this.config.useAdvancedBreakpoint, true);
  }
  protected async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request): Promise<void> {
    this.sendResponse(response);

    this.isPaused = true;
    const result = await this.session!.sendContinuationCommand('step_into');
    this.checkContinuationStatus(result, this.config.useAdvancedBreakpoint, true);
  }
  protected async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request): Promise<void> {
    this.sendResponse(response);

    this.isPaused = true;
    const result = await this.session!.sendContinuationCommand('step_out');
    this.checkContinuationStatus(result, this.config.useAdvancedBreakpoint, true);
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
          const filePath = this.convertDebuggerPathToClient(stackFrame.fileUri);
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

      const property = await this.session!.fetchLatestProperty(propertyName);
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
    const resolver = new AhkIncludeResolver({
      rootPath: this.config.program,
      runtimePath: this.config.runtime,
      version: this.ahkVersion,
    });

    const sources: DebugProtocol.Source[] = [ { name: path.basename(this.config.program), path: this.config.program } as DebugProtocol.Source ];
    await Promise.all(resolver.extractAllIncludePath([ 'local', 'user', 'standard' ]).map(async(filePath): Promise<void> => {
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
  private getCurrentBreakpoint(stackFrame: dbgp.StackFrame): dbgp.Breakpoint | null {
    const { fileUri, line } = stackFrame;
    const filePath = this.convertDebuggerPathToClient(fileUri);
    const breakpoint = this.breakpoints[`${filePath.toLowerCase()}${String(line)}`];
    if (breakpoint) {
      return breakpoint;
    }
    return null;
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
  private async checkContinuationStatus(response: dbgp.ContinuationResponse, checkExtraBreakpoint = false, forceStop = false): Promise<void> {
    this.clearPerfTipsDecorations();

    if (response.status === 'stopped') {
      this.isSessionStopped = true;
    }
    else if (response.status === 'break') {
      const { stackFrames } = await this.session!.sendStackGetCommand();
      this.currentStackFrames = stackFrames;

      const stackFrame = stackFrames[0];
      const breakpoint = this.getCurrentBreakpoint(stackFrame);

      const metaVariables = new CaseInsensitiveMap<string, string>();
      metaVariables.set('file', this.convertDebuggerPathToClient(stackFrame.fileUri));
      metaVariables.set('line', String(stackFrame.line));

      if (this.metaVariablesWhenNotBreak) {
        const executeTime_ns = parseFloat(this.metaVariablesWhenNotBreak.get('executeTime_ns')!) + response.executeTime.ns;
        const executeTime_ms = parseFloat(this.metaVariablesWhenNotBreak.get('executeTime_ms')!) + response.executeTime.ms;
        const executeTime_s = parseFloat(this.metaVariablesWhenNotBreak.get('executeTime_s')!) + response.executeTime.s;
        metaVariables.set('executeTime_ns', String(executeTime_ns).slice(0, 10));
        metaVariables.set('executeTime_ms', String(executeTime_ms).slice(0, 10));
        metaVariables.set('executeTime_s', String(executeTime_s.toFixed(8)).slice(0, 10));
      }
      else {
        metaVariables.set('executeTime_ns', String(response.executeTime.ns).slice(0, 10));
        metaVariables.set('executeTime_ms', String(response.executeTime.ms).slice(0, 10));
        metaVariables.set('executeTime_s', String(response.executeTime.s.toFixed(8)).slice(0, 10));
      }
      if (this.config.useProcessUsageData) {
        const usage = await pidusage(this.ahkProcess!.pid);
        metaVariables.set('usageCpu', String(usage.cpu));
        metaVariables.set('usageMemory_B', String(usage.memory));
        metaVariables.set('usageMemory_MB', String(byteConverter.convert(usage.memory, 'B', 'MB')));
      }
      if (response.commandName !== 'break') {
        this.currentMetaVariables = metaVariables;

        if (checkExtraBreakpoint) {
          if (breakpoint?.advancedData) {
            breakpoint.advancedData.counter++;
            metaVariables.set('condition', breakpoint.advancedData.condition ?? '');
            metaVariables.set('hitCondition', breakpoint.advancedData.hitCondition ?? '');
            metaVariables.set('hitCount', breakpoint.advancedData.counter ? String(breakpoint.advancedData.counter) : '-1');
            metaVariables.set('logMessage', breakpoint.advancedData.logMessage ?? '');
          }

          await this.checkAdvancedBreakpoint(metaVariables, forceStop);
          return;
        }
      }

      this.metaVariablesWhenNotBreak = null;
      this.sendEvent(new StoppedEvent(response.stopReason, this.session!.id));
      this.displayPerfTips(metaVariables);
    }
  }
  private async checkAdvancedBreakpoint(metaVariables: CaseInsensitiveMap<string, string>, forceStop = false): Promise<void> {
    const condition = metaVariables.get('condition');
    const hitCondition = metaVariables.get('hitCondition');
    const hitCount = metaVariables.has('hitCount') ? parseInt(metaVariables.get('hitCount')!, 10) : -1;
    const logMessage = metaVariables.get('logMessage');

    let conditionResult = false, hitConditionResult = false;
    if (condition) {
      conditionResult = await this.conditionalEvaluator.eval(condition, metaVariables);
    }
    if (hitCondition) {
      const match = hitCondition.match(/^(?<operator><=|<|>=|>|==|=|%)?\s*(?<number>\d+)$/u);
      if (match?.groups) {
        const { operator, number } = match.groups;

        let _operator = operator;
        if (typeof _operator === 'undefined') {
          _operator = '>=';
        }
        else if (_operator === '=') {
          _operator = '==';
        }

        const code = _operator === '%'
          ? `(${hitCount % parseInt(number, 10)} === 0)`
          : `${hitCount} ${_operator} ${number}`;
        try {
          hitConditionResult = await this.conditionalEvaluator.eval(code, metaVariables);
        }
        catch {
        }
      }
    }

    let matchCondition = true;
    if (condition && hitCondition) {
      matchCondition = conditionResult && hitConditionResult;
    }
    else if (condition || hitCondition) {
      matchCondition = conditionResult || hitConditionResult;
    }

    if (matchCondition) {
      if (typeof logMessage === 'undefined' || logMessage === '') {
        let stopReason = 'conditional breakpoint';
        if (typeof condition === 'undefined' && typeof hitCondition === 'undefined') {
          stopReason = 'breakpoint';
        }
        this.metaVariablesWhenNotBreak = null;
        this.sendEvent(new StoppedEvent(stopReason, this.session!.id));
        this.displayPerfTips(metaVariables);
        return;
      }

      await this.printLogMessage(metaVariables, 'stdout', true);
    }

    if (forceStop) {
      this.metaVariablesWhenNotBreak = null;
      this.sendEvent(new StoppedEvent('force stop', this.session!.id));
      this.displayPerfTips(metaVariables);
      return;
    }

    this.metaVariablesWhenNotBreak = metaVariables;

    let result: dbgp.ContinuationResponse;
    if (this.isPaused) {
      result = await this.session!.sendContinuationCommand('break');
    }
    else {
      this.metaVariablesWhenNotBreak = null;
      result = await this.session!.sendContinuationCommand('run');
    }
    await this.checkContinuationStatus(result, true);
  }
  private async printLogMessage(messageOrmetaVariables: string | CaseInsensitiveMap<string, string>, logCategory: string, newline = false): Promise<void> {
    let metaVariables: CaseInsensitiveMap<string, string>;
    if (typeof messageOrmetaVariables === 'string') {
      metaVariables = new CaseInsensitiveMap<string, string>();
      metaVariables.set('logMessage', messageOrmetaVariables);
    }
    else {
      metaVariables = messageOrmetaVariables;
    }

    const logMessage = metaVariables.get('logMessage') ?? '';
    const results = await this.formatLog(logMessage, metaVariables);
    for (let i = 0; i < results.length; i++) {
      const messageOrProperty = results[i];
      if (typeof messageOrProperty === 'string') {
        const message = newline && i === results.length - 1
          ? `${messageOrProperty}\n`
          : `${messageOrProperty}`;
        this.sendEvent(new OutputEvent(message, logCategory));
      }
      else {
        const property = messageOrProperty;
        const variablesReference = this.variablesReferenceCounter++;
        this.logObjectPropertiesByVariablesReference.set(variablesReference, property);

        const event = new OutputEvent(property.displayValue, logCategory) as DebugProtocol.OutputEvent;
        event.body.variablesReference = variablesReference;
        if (metaVariables.has('file')) {
          event.body.source = { path: metaVariables.get('file') };
        }
        if (metaVariables.has('line')) {
          event.body.line = parseInt(metaVariables.get('line')!, 10);
        }
        this.sendEvent(event);
      }
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
        const property = await this.session!.fetchLatestProperty(variableName);

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

    const filePath = metaVarialbes.has('file') ? metaVarialbes.get('file')! : '';
    const line_0base = metaVarialbes.has('line') ? parseInt(metaVarialbes.get('line')!, 10) - 1 : -1;
    const decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        fontStyle: this.config.usePerfTips.fontStyle,
        color: this.config.usePerfTips.fontColor,
        contentText: ` ${message}`,
      },
    });
    this.perfTipsDecorationTypes.push(decorationType);

    const document = await vscode.workspace.openTextDocument(filePath);
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
