import { DebugProtocol } from '@vscode/debugprotocol';

// #region LanchConfigurations
export type AnnounceLevel = boolean | 'error' | 'detail' | 'develop';
export type FunctionBreakPointAdvancedData = { name: string; condition?: string; hitCondition?: string; logPoint?: string };

export type MatchSelector = undefined | 'first' | 'last' | 'all' | number | number[];
export type LineMatcher =
  | number
  | number[]
  | RegExLineMatcher;
export interface RegExLineMatcher {
  pattern: string;
  ignoreCase?: boolean;
  select?: MatchSelector;
  offset?: number;
}
export type LineMatchResult = { line: number; match?: RegExpMatchArray };
export type HiddenBreakpointActionName = 'ClearConsole';
export interface HiddenBreakpoint {
  target: string | string[];
  line: LineMatcher;
  condition?: string;
  hitCondition?: string;
  log?: string;
  break: boolean;
  action?: HiddenBreakpointActionName;
}
export interface HiddenBreakpointWithUI {
  id: string;
  label: string;
  breakpoints: HiddenBreakpoint[];
}
export interface PerfTipsConfig {
  fontColor: string;
  fontStyle: string;
  format: string;
}
export const scopeNames = [ 'Local', 'Static', 'Global' ] as const;
export type ScopeName = typeof scopeNames[number];
export type ScopeSelector = '*' | ScopeName;
export type MatcherData = {
  method?: 'include' | 'exclude';
  ignorecase?: boolean;
  pattern?: string;
  static?: boolean;
  builtin?: boolean;
  type?: string;
  className?: string;
};
export type CategoryData = {
  label: string;
  source: ScopeSelector | ScopeName[];
  hidden?: boolean | 'auto';
  noduplicate?: boolean;
  matchers?: MatcherData[];
};
export type CategoriesData = 'recommend' | Array<ScopeSelector | CategoryData>;
export interface LanchConfigurations extends DebugProtocol.LaunchRequestArguments, DebugProtocol.AttachRequestArguments {
  name: string;
  program: string;
  request: 'launch' | 'attach';
  runtime: string;
  cwd: string;
  runtimeArgs: string[];
  args: string[];
  env: NodeJS.ProcessEnv;
  stopOnEntry: boolean;
  hostname: string;
  port: number;
  maxChildren: number;
  usePerfTips: false | PerfTipsConfig;
  useIntelliSenseInDebugging: boolean;
  useDebugDirective: false | {
    useBreakpointDirective: boolean;
    useOutputDirective: boolean;
    useClearConsoleDirective: boolean;
  };
  useAutoJumpToError: boolean;
  useUIAVersion: boolean;
  useOutputDebug: false | {
    category: 'stdout' | 'stderr' | 'console';
    useTrailingLinebreak: boolean;
  };
  useAnnounce: AnnounceLevel;
  useLoadedScripts: false | {
    scanImplicitLibrary: boolean;
  };
  useExceptionBreakpoint: boolean;
  openFileOnExit: string;
  trace: boolean;
  skipFunctions?: string[];
  skipFiles?: string[];
  variableCategories?: CategoryData[];
  setHiddenBreakpoints?: Array<HiddenBreakpoint | HiddenBreakpointWithUI>;
  // The following is not a configuration, but is set to pass data to the debug adapter.
  cancelReason?: string;
  autohotkeyInstallDirectory: string;
}
// #endregion LanchConfigurations
