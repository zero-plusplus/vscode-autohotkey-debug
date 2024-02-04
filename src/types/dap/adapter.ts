import { NormalizedDebugConfig } from './config';
import { ScriptRuntime } from './runtime/scriptRuntime';

export type LogCategory = 'stdout' | 'stderr' | 'console';
export type AnnounceLevel = 'error' | 'detail' | 'develop';

// #region configuration of launch.json
export interface OutputDebugConfig {
  category: LogCategory;
  useTrailingLinebreak: boolean;
}
export interface DebugDirectiveConfig {
  useBreakpointDirective: boolean;
  useOutputDirective: boolean;
  useClearConsoleDirective: boolean;
}
// #endregion configuration of launch.json

export interface DebugContext {
  runtime: ScriptRuntime;
  config: NormalizedDebugConfig;
}
