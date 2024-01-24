import { DebugProtocol } from '@vscode/debugprotocol';
import { NormalizedDebugConfig } from './config';
import { Session } from './session';
import { LogCategory } from './adapter';

export type RunCommand = string; // e.g. AutoHotkey.exe /Debug script.ahk
export type LaunchMethod
  = 'node'
  | 'cmd'; // Security may not allow execution on `node`, so as a workaround, execute on command prompt
export type ScriptRuntimeCreateor = (config: NormalizedDebugConfig) => ScriptRuntime;
export interface ScriptRuntime {
  config: NormalizedDebugConfig;
  session: Session;
  launch: () => Promise<RunCommand>;
  attach: () => Promise<void>;
  close: () => Promise<void>;
  detach: () => Promise<void>;

  // #region handler for adapter requests
  // #region basic request
  configurationDone: (args: DebugProtocol.ConfigurationDoneArguments) => Promise<void>;
  disconnet: (args: DebugProtocol.DisconnectArguments) => Promise<void>;
  setVariable: (args: DebugProtocol.SetVariableArguments) => Promise<DebugProtocol.SetVariableResponse['body']>;
  setExpression: (args: DebugProtocol.SetExpressionArguments) => Promise<DebugProtocol.SetExpressionResponse['body']>;
  setBreakpoints: (args: DebugProtocol.SetBreakpointsArguments) => Promise<DebugProtocol.SetBreakpointsResponse['body']>;
  setFunctionBreakPoints: (args: DebugProtocol.SetFunctionBreakpointsArguments) => Promise<DebugProtocol.SetFunctionBreakpointsResponse['body']>;
  setExceptionBreakPoints: (args: DebugProtocol.SetExceptionBreakpointsArguments) => Promise<DebugProtocol.SetExceptionBreakpointsResponse['body']>;
  exceptionInfo: (args: DebugProtocol.ExceptionInfoArguments) => Promise<DebugProtocol.ExceptionInfoResponse['body']>;
  threads: () => Promise<DebugProtocol.ThreadsResponse['body']>;
  stackTrace: (args: DebugProtocol.StackTraceArguments) => Promise<DebugProtocol.StackTraceResponse['body']>;
  scopes: (args: DebugProtocol.ScopesArguments) => Promise<DebugProtocol.ScopesResponse['body']>;
  variables: (args: DebugProtocol.VariablesArguments) => Promise<DebugProtocol.VariablesResponse['body']>;
  evaluate: (args: DebugProtocol.EvaluateArguments) => Promise<DebugProtocol.EvaluateResponse['body']>;
  completions: (args: DebugProtocol.CompletionsArguments) => Promise<DebugProtocol.CompletionsResponse['body']>;
  loadedSources: (args: DebugProtocol.LoadedSourcesArguments) => Promise<DebugProtocol.LoadedSourcesResponse['body']>;
  // #endregion basic request

  // #region custom request
  /**
   * The handler is called only once for each script retrieved by loadedSourcesRequest.
   * @param args
   * @returns
   */
  setDebugDirectives: (args: { source: DebugProtocol.Source }) => Promise<void>;
  /**
   * Provides a way to execute OutputEvents from the client.
   * @param args
   * @returns
   */
  echo: (args: { message: string; category: LogCategory }) => Promise<void>;

  // #endregion custom request

  // #region execution request
  /**
   * Request dbgp run command execution
   */
  continue: () => Promise<DebugProtocol.ContinueResponse>;
  /**
   * Request dbgp step-over command execution
   */
  next: () => Promise<DebugProtocol.NextResponse>;
  /**
   * Request dbgp step-in command execution
   */
  stepIn: () => Promise<DebugProtocol.StepInResponse>;
  /**
   * Request dbgp step-out command execution
   */
  stepOut: () => Promise<DebugProtocol.StepOutResponse>;
  /**
   * Request dbgp step-out command execution
   */
  pause: () => Promise<DebugProtocol.PauseResponse>;
  // #endregion execution request
  // #endregion handler for adapter requests

  // #region event handlers
  /**
   * The handler for messages output using `FileAppend` or `FileOpen("*", "w").write()`.
   * @param message Message output to stdout
   * @returns
   */
  onStdOut: (message: string) => void;
  /**
   * The handler for messages output using `FileOpen("**", "w").write()`.
   * @param message Message output to stderr
   * @returns
   */
  onStdErr: (message: string) => void;
  /**
   * The handler for messages output using `OutputDebug`.
   * @param message Message output using `OutputDebug`
   * @returns
   */
  onOutputDebug: (message) => void;
  /**
   * The handler for warning message from the AutoHotkey debugger.
   * @param message
   * @returns
   */
  onWarning: (message: string) => void;
  /**
   * The handler for error message from the AutoHotkey debugger.
   * @param message
   * @returns
   */
  onError: (error?: Error) => void;
  /**
   * The handler for when the AutoHotkey script process is closed.
   * @param exitCode
   * @returns
   */
  onProcessClose: (exitCode?: number) => void;
  /**
   * The handler when the closed socket used to communicate with the AutoHotkey debugger.
   * @returns
   */
  onSocketClose: () => void;
  /**
   * The handler when the closed server used to communicate with the AutoHotkey debugger.
   * @returns
   */
  onServerClose: () => void;
  // #endregion event handlers
}

