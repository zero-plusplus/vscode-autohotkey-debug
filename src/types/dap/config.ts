import { DebugProtocol } from '@vscode/debugprotocol';
import { BreakpointData } from './breakpoint';
import { VariableCategory } from './variableCategory';
import { PerfTipsConfig } from './perftips';

export type AnnounceLevel = boolean | 'error' | 'detail' | 'develop';
export type FunctionBreakPointAdvancedData = { name: string; condition?: string; hitCondition?: string; logPoint?: string };

export type DebugRequest = 'launch' | 'attach';
export type Breakpoint
  = LineBreakpoint;
export interface LineBreakpoint extends BreakpointData {
  kind: 'line';
}
export interface BreakpointGroup {
  label: string;
  breakpoints: Breakpoint[];
}
export interface DebugConfig extends DebugProtocol.LaunchRequestArguments, DebugProtocol.AttachRequestArguments {
  // #region basic configurations
  name: string;
  request: DebugRequest;
  stopOnEntry: boolean;
  skipFunctions?: string[];
  skipFiles?: string[];
  trace: boolean;
  // #region basic configurations

  // #region custom configurations
  openFileOnExit: string;
  variableCategories?: false | 'recommend' | VariableCategory[];
  setBreakpoints?: Array<BreakpointData & { visible?: boolean }>;
  // #endregion custom configurations

  // #region launcher configurations
  runtime: string;
  program: string;
  runtimeArgs?: string[];
  args?: string[];
  port?: number;
  hostname?: string;
  noDebug?: boolean;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  // #endregion lancher configurations

  // #region dbgp configurations
  maxChildren: number;
  // #endregion dbgp configurations

  // #region feature configurations
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
  // #endregion feature configurations

  // // The following is not a configuration, but is set to pass data to the debug adapter.
  // cancelReason?: string;
  // autohotkeyInstallDirectory: string;
}
export type DefaultedDebugConfig = Required<DebugConfig>;
