import { NormalizedDebugConfig } from '../config.types';
import { ExecResult, ScriptStatus, Session } from '../../dbgp/session.types';
import { BreakpointManager } from './breakpoint.types';
import { ContinuationCommandExecutor } from './executor.types';
import { MessageCategory } from '../adapter/adapter.types';
import { ExecutionContextManager } from './context.types';

export type RunCommand = string; // e.g. AutoHotkey.exe /Debug script.ahk
export type LaunchMethod =
  | 'node'
  | 'cmd'; // Security may not allow execution on `node`, so as a workaround, execute on command prompt

export interface ScriptRuntimeLauncher {
  launch: () => Promise<ScriptRuntime>;
  attach: () => Promise<ScriptRuntime>;
}
export type ScriptRuntimeCreateor = (config: NormalizedDebugConfig) => ScriptRuntime;
export interface ScriptRuntime extends BreakpointManager, ExecutionContextManager {
  readonly threadId: number;
  session: Session;
  config: NormalizedDebugConfig;
  isClosed: boolean;
  suppressException: () => Promise<boolean>;
  setExceptionBreakpoint: (state: boolean) => Promise<boolean>;
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
  echo: (args: { message: string; category: MessageCategory }) => Promise<void>;
}
