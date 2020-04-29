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
  ThreadEvent,
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import {
  DbgpSession,
  InitPacket,
} from './dbgpSession';


interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
  program: string;
  runtime: string;
  stopOnEntry?: boolean;
  hostname?: string;
  port?: number;
}
export class AhkDebugSession extends LoggingDebugSession {
  // private static readonly THREAD_ID = 1;
  private server?: net.Server;
  private session?: DbgpSession;
  private ahkProcess?: ChildProcessWithoutNullStreams;
  constructor() {
    super('ahk-debug.txt');

    this.setDebuggerColumnsStartAt1(true);
    this.setDebuggerLinesStartAt1(true);
  }
  protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
    response.body = response.body ?? {};

    this.sendResponse(response);

    // Request breakpoints from VS Code
    this.sendEvent(new InitializedEvent());
  }
  protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
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
        this.sendEvent(new ThreadEvent('Session exited.', DbgpSession.ID));

        if (this.session === undefined) {
          return;
        }
        this.session.close();
      };

      this.server = net.createServer()
        .listen(args.port, args.hostname)
        .on('connection', (socket) => {
          try {
            this.session = new DbgpSession(socket)
              .on('init', (initPacket: InitPacket) => {
                console.log(initPacket);
              })
              .on('warning', (warning: string) => {
                this.sendEvent(new OutputEvent(`${warning}\n`));
              })
              .on('error', disposeConnection)
              .on('close', disposeConnection);

            this.sendEvent(new ThreadEvent('Session started.', DbgpSession.ID));
          }
          catch (error) {
            this.sendEvent(new ThreadEvent('Failed to start session.', DbgpSession.ID));
            if (this.server) {
              this.server.close();
            }
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

    this.continueRequest(response as DebugProtocol.ContinueResponse);
  }
  protected continueRequest(response: DebugProtocol.ContinueResponse): void {
    this.sendResponse(response);
  }
  protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
    this.sendResponse(response);
  }
  protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request): void {
    if (this.server) {
      this.server.close();
    }
    if (this.ahkProcess) {
      this.ahkProcess.kill();
    }
  }
}
