import { NormalizedDebugConfig } from '../config.types';
import { LogCategory } from '../adapter.types';
import { ExecResult, ScriptStatus, Session } from '../../dbgp/session.types';
import { BreakpointManager } from './breakpoint.types';
import { ContinuationCommandExecutor } from './executor.types';
import { CallStackManager } from './callstack.types';
import { VariableManager } from './variable.types';

export type RunCommand = string; // e.g. AutoHotkey.exe /Debug script.ahk
export type LaunchMethod =
  | 'node'
  | 'cmd'; // Security may not allow execution on `node`, so as a workaround, execute on command prompt

export interface ScriptRuntimeLauncher {
  launch: () => Promise<ScriptRuntime>;
  attach: () => Promise<ScriptRuntime>;
}
export type ScriptRuntimeCreateor = (config: NormalizedDebugConfig) => ScriptRuntime;
export interface ScriptRuntime extends CallStackManager, BreakpointManager, VariableManager {
  readonly threadId: number;
  session: Session;
  config: NormalizedDebugConfig;
  isClosed: boolean;
  close: () => Promise<Error | undefined>;
  detach: () => Promise<Error | undefined>;
  exec: ContinuationCommandExecutor;
  run: () => Promise<ExecResult>;
  stepIn: () => Promise<ExecResult>;
  stepOut: () => Promise<ExecResult>;
  stepOver: () => Promise<ExecResult>;
  stop: () => Promise<ExecResult>;
  pause: () => Promise<ScriptStatus>;
  /**
   * The handler is called only once for each script retrieved by loadedSourcesRequest.
   * @param args
   * @returns
   */
  setDebugDirectives: () => Promise<void>;
  /**
   * Provides a way to execute OutputEvents from the client.
   * @param args
   * @returns
   */
  echo: (args: { message: string; category: LogCategory }) => Promise<void>;

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

