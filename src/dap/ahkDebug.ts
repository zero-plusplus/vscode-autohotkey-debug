import * as path from 'path';
import * as net from 'net';
import {
  ChildProcessWithoutNullStreams,
  spawn,
} from 'child_process';
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
import AhkIncludeResolver from '@zero-plusplus/ahk-include-path-resolver';
import * as dbgp from './dbgpSession';

export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
  program: string;
  runtime: string;
  stopOnEntry?: boolean;
  hostname?: string;
  port?: number;
  maxChildren: number;
  version: 1 | 2;
}

export class AhkDebugSession extends LoggingDebugSession {
  private server!: net.Server;
  private session!: dbgp.Session;
  private ahkProcess!: ChildProcessWithoutNullStreams;
  private config!: LaunchRequestArguments;
  private readonly contexts = new Map<number, dbgp.Context>();
  private stackFrameIdCounter = 1;
  private readonly stackFrames = new Map<number, dbgp.StackFrame>();
  private variableReferenceCounter = 1;
  private readonly objectProperties = new Map<number, dbgp.ObjectProperty>();
  constructor() {
    super('ahk-debug.txt');

    this.setDebuggerColumnsStartAt1(true);
    this.setDebuggerLinesStartAt1(true);
    this.setDebuggerPathFormat('uri');
  }
  protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
    response.body = {
      supportsConfigurationDoneRequest: true,
      supportsLoadedSourcesRequest: true,
    };

    this.sendResponse(response);
  }
  protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request): void {
    this.ahkProcess.kill();
    this.session.close();
    this.server.close();
  }
  protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
    this.config = args;
    const lunchScript = (): void => {
      const ahkProcess = spawn(
        args.runtime,
        [ `/Debug=${String(args.hostname)}:${String(args.port)}`, `${args.program}` ],
        { cwd: path.dirname(args.program) },
      );
      ahkProcess.stdout.on('data', (chunkData: string | Buffer) => {
        this.sendEvent(new OutputEvent(String(chunkData), 'stdout'));
      });
      ahkProcess.stderr.on('data', (chunkData: Buffer) => {
        this.sendEvent(new OutputEvent(String(chunkData), 'stderr'));
      });

      this.ahkProcess = ahkProcess;
    };
    const createServer = (): void => {
      const disposeConnection = (error?: Error): void => {
        if (error) {
          this.sendEvent(new OutputEvent(`Session closed for the following reasons: ${error.message}\n`));
        }
        this.sendEvent(new ThreadEvent('Session exited.', this.session.id));

        if (typeof this.session === 'undefined') {
          return;
        }
        this.session.close();
      };

      this.server = net.createServer()
        .listen(args.port, args.hostname)
        .on('connection', (socket) => {
          try {
            this.session = new dbgp.Session(socket)
              .on('init', (initPacket: dbgp.InitPacket) => {
                if (typeof this.session === 'undefined') {
                  return;
                }
                // Request breakpoints from VS Code
                this.sendEvent(new InitializedEvent());
              })
              .on('warning', (warning: string) => {
                this.sendEvent(new OutputEvent(`${warning}\n`));
              })
              .on('error', disposeConnection)
              .on('close', disposeConnection);

            this.sendEvent(new ThreadEvent('Session started.', this.session.id));
          }
          catch (error) {
            this.sendEvent(new ThreadEvent('Failed to start session.', this.session.id));
            this.server.close();
            this.shutdown();
          }
        });
    };

    try {
      createServer();
      lunchScript();
    }
    catch (error) {
      this.sendErrorResponse(response, error);
      return;
    }

    this.sendResponse(response);

    // this.continueRequest(response as DebugProtocol.ContinueResponse);
  }
  protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): Promise<void> {
    const fileUri = this.convertClientPathToDebugger(args.source.path ?? '');
    const lines = args.lines ?? [];
    const dbgpBreakpoint = (await this.session.sendBreakpointListCommand()).breakpoints;

    // Clear dbgp breakpoints from current file
    await Promise.all(dbgpBreakpoint
      .filter((breakpoint) => {
        // (breakpoint.fileUri === fileUri) is not Equals.
        // breakpoint.fileUri: file:///W%3A/project/vscode-ahk-debug/demo/demo.ahk"
        // fileUri:            file:///w:/project/vscode-ahk-debug/demo/demo.ahk
        const filePath = this.convertDebuggerPathToClient(breakpoint.fileUri);
        return filePath === args.source.path;
      })
      .map(async(breakpoint) => {
        return this.session.sendBreakpointRemoveCommand(breakpoint);
      }));

    const vscodeBreakpoints: DebugProtocol.Breakpoint[] = [];

    await Promise.all(lines
      .map(async(vscodeBreakpointLine, index) => {
        try {
          const { id } = await this.session.sendBreakpointSetCommand(fileUri, vscodeBreakpointLine);
          const { line } = await this.session.sendBreakpointGetCommand(id);

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

    response.body = { breakpoints: vscodeBreakpoints };
    this.sendResponse(response);
  }
  protected async configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments, request?: DebugProtocol.Request): Promise<void> {
    await this.session.sendFeatureSetCommand('max_children', this.config.maxChildren);

    const dbgpResponse = this.config.stopOnEntry
      ? await this.session.sendStepIntoCommand()
      : await this.session.sendRunCommand();

    this.sendResponse(response);
    this.checkContinuationStatus(dbgpResponse);
  }
  protected async continueRequest(response: DebugProtocol.ContinueResponse): Promise<void> {
    const dbgpResponse = await this.session.sendRunCommand();
    this.sendResponse(response);
    this.checkContinuationStatus(dbgpResponse);
  }
  protected async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments, request?: DebugProtocol.Request): Promise<void> {
    const dbgpResponse = await this.session.sendStepOverCommand();
    this.sendResponse(response);
    this.checkContinuationStatus(dbgpResponse);
  }
  protected async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request): Promise<void> {
    const dbgpResponse = await this.session.sendStepIntoCommand();
    this.sendResponse(response);
    this.checkContinuationStatus(dbgpResponse);
  }
  protected async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request): Promise<void> {
    const dbgpResponse = await this.session.sendStepOutCommand();
    this.sendResponse(response);
    this.checkContinuationStatus(dbgpResponse);
  }
  protected threadsRequest(response: DebugProtocol.ThreadsResponse, request?: DebugProtocol.Request): void {
    response.body = { threads: [ new Thread(this.session.id, 'Thread 1') ] };
    this.sendResponse(response);
  }
  protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments, request?: DebugProtocol.Request): Promise<void> {
    const { stackFrames } = await this.session.sendStackGetCommand();
    response.body = {
      stackFrames: stackFrames.map((stackFrame) => {
        const id = this.stackFrameIdCounter++;
        const filePath = this.convertDebuggerPathToClient(stackFrame.fileUri);
        const source = {
          name: path.basename(filePath),
          path: stackFrame.fileUri,
        } as DebugProtocol.Source;

        this.stackFrames.set(id, stackFrame);
        return {
          id,
          source,
          name: stackFrame.name,
          line: stackFrame.line,
          column: 1,
        } as StackFrame;
      }),
    };

    this.sendResponse(response);
  }
  protected async scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments, request?: DebugProtocol.Request): Promise<void> {
    const stackFrame = this.stackFrames.get(args.frameId);
    if (typeof stackFrame === 'undefined') {
      throw new Error(`Unknown frameId ${args.frameId}`);
    }
    const { contexts } = await this.session.sendContextNamesCommand(stackFrame);

    response.body = {
      scopes: contexts.map((context) => {
        const variableReference = this.variableReferenceCounter++;

        this.contexts.set(variableReference, context);
        return new Scope(context.name, variableReference);
      }),
    };

    this.sendResponse(response);
  }
  protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request): Promise<void> {
    let properties: dbgp.Property[] = [];

    if (this.contexts.has(args.variablesReference)) {
      const context = this.contexts.get(args.variablesReference)!;
      properties = (await this.session.sendContextGetCommand(context)).properties;
    }
    else if (this.objectProperties.has(args.variablesReference)) {
      const objectProperty = this.objectProperties.get(args.variablesReference)!;
      const { children } = (await this.session.sendPropertyGetCommand(objectProperty)).properties[0] as dbgp.ObjectProperty;
      properties = children;
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

      if (property.type === 'object') {
        const objectProperty = property as dbgp.ObjectProperty;

        variablesReference = this.variableReferenceCounter++;
        this.objectProperties.set(variablesReference, objectProperty);
        if (objectProperty.isArray) {
          const maxIndex = objectProperty.maxIndex!;
          if (100 < maxIndex) {
            indexedVariables = maxIndex;
            namedVariables = 1;
          }
        }
      }

      const name = property.isIndex ? String(property.index!) : property.name;
      variables.push({
        name,
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
  protected sourceRequest(response: DebugProtocol.SourceResponse, args: DebugProtocol.SourceArguments, request?: DebugProtocol.Request): void {
    this.sendResponse(response);
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  protected async loadedSourcesRequest(response: DebugProtocol.LoadedSourcesResponse, args: DebugProtocol.LoadedSourcesArguments, request?: DebugProtocol.Request): Promise<void> {
    const resolver = new AhkIncludeResolver({
      rootPath: this.config.program,
      runtimePath: this.config.runtime,
      version: this.config.version,
    });

    response.body = {
      sources: resolver.extractAllIncludePath([ 'local', 'user', 'standard' ])
        .map((filePath) => {
          return { name: path.basename(filePath), path: filePath };
        }),
    };
    this.sendResponse(response);
  }
  private checkContinuationStatus(response: dbgp.ContinuationResponse): void {
    if (response.status === 'stopped') {
      this.sendEvent(new TerminatedEvent('Debug exited'));
    }
    else if (response.status === 'break') {
      let reason: 'entry' | 'step' | 'breakpoint' = 'breakpoint';
      if (this.config.stopOnEntry) {
        reason = 'entry';
      }
      else if (response.commandName.startsWith('step')) {
        reason = 'step';
      }
      this.sendEvent(new StoppedEvent(reason, this.session.id));
    }
  }
}
