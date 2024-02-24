import { NormalizedDebugConfig } from './config.types';
import { ScriptRuntime } from './runtime/scriptRuntime.types';

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
