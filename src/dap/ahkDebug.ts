import { LoggingDebugSession } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';

interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
  program: string;
  runtime: string;
  stopOnEntry?: boolean;
}
export class AhkDebugSession extends LoggingDebugSession {
  // private static readonly THREAD_ID = 1;
  constructor() {
    super('ahk-debug.txt');

    this.setDebuggerLinesStartAt1(false);
    this.setDebuggerColumnsStartAt1(false);
  }
  protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
    response.body = response.body ?? {};

    this.sendResponse(response);
  }
  protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
    this.sendResponse(response);
  }
}
