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
  StackFrame,
  StoppedEvent,
  Thread,
  ThreadEvent,
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import * as dbgp from './dbgpSession';


interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
  program: string;
  runtime: string;
  stopOnEntry?: boolean;
  hostname?: string;
  port?: number;
}

export class AhkDebugSession extends LoggingDebugSession {
  private server!: net.Server;
  private session!: dbgp.Session;
  private ahkProcess!: ChildProcessWithoutNullStreams;
  private config!: LaunchRequestArguments;
  private stackFrameIdCounter = 1;
  private readonly stackFrameMap = new Map<number, dbgp.StackFrame>();
  constructor() {
    super('ahk-debug.txt');

    this.setDebuggerColumnsStartAt1(true);
    this.setDebuggerLinesStartAt1(true);
    this.setDebuggerPathFormat('uri');
  }
  protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
    response.body = { supportsConfigurationDoneRequest: true };

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

    if (args.stopOnEntry) {
      this.sendResponse(response);
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
      .filter((breakpoint) => breakpoint.fileUri === fileUri)
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
          path: stackFrame.fileUri, // filePath,

        } as DebugProtocol.Source;

        this.stackFrameMap.set(id, stackFrame);
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
  protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments, request?: DebugProtocol.Request): void {
    this.sendResponse(response);
  }
  protected sourceRequest(response: DebugProtocol.SourceResponse, args: DebugProtocol.SourceArguments, request?: DebugProtocol.Request): void {
    this.sendResponse(response);
  }
  private checkContinuationStatus(response: dbgp.ContinuationResponse): void {
    if (response.status === 'stopped') {
      this.sendEvent(new ThreadEvent('Session exited', this.session.id));
      this.session.close();
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
