import { NormalizedDebugConfig } from '../config.types';
import { ExecResult, ScriptStatus, Session } from '../../dbgp/session.types';
import { BreakpointManager } from './breakpoint.types';
import { ContinuationCommandExecutor } from './executor.types';
import { ExecutionContextManager } from './context.types';
import { ParsedAutoHotkeyVersion } from '../../tools/autohotkey/version/common.types';

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
  version: ParsedAutoHotkeyVersion;
  isClosed: boolean;
  close: () => Promise<void>;
  detach: () => Promise<void>;
  suppressException: () => Promise<boolean>;
  exec: ContinuationCommandExecutor;
  run: () => Promise<ExecResult>;
  stepIn: () => Promise<ExecResult>;
  stepOut: () => Promise<ExecResult>;
  stepOver: () => Promise<ExecResult>;
  stop: () => Promise<ExecResult>;
  pause: () => Promise<ScriptStatus | undefined>;
}
