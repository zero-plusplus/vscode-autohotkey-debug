import { DebugProtocol } from '@vscode/debugprotocol';
import { BreakpointDataArray } from './breakpoint';
import { VariableCategory } from './variableCategory';
import { PerfTipsConfig } from './perftips';
import { LoadedScriptsConfig } from './loadedScripts';
import { AnnounceLevel, DebugDirectiveConfig, OutputDebugConfig } from './adapter';

export type AttributeType = 'string' | 'number' | 'boolean' | 'object' | 'string[]' | 'number[]' | 'boolean[]';
export type AttributeValidator = (config: DebugConfig) => Promise<void>;

export type DebugConfigValidator = (config: DebugConfig) => Promise<NormalizedDebugConfig>;
export type DebugRequest = 'launch' | 'attach';
export interface DebugConfig extends DebugProtocol.LaunchRequestArguments, DebugProtocol.AttachRequestArguments {
  // #region basic configurations
  name?: string;
  type: string;
  request?: DebugRequest;
  stopOnEntry: boolean;
  skipFunctions?: string[];
  skipFiles?: string[];
  trace: boolean;

  // #region launcher configurations
  runtime: string;
  runtimeArgs?: string[];
  program: string;
  args?: string[];
  port?: number;
  hostname?: string;
  noDebug?: boolean;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  // #endregion lancher configurations
  // #region basic configurations

  // #region custom configurations
  openFileOnExit?: string;
  variableCategories?: false | 'recommend' | VariableCategory[];
  setBreakpoints?: BreakpointDataArray;
  // #endregion custom configurations

  // #region dbgp configurations
  maxChildren: number;
  // #endregion dbgp configurations

  // #region feature configurations
  usePerfTips: boolean | PerfTipsConfig;
  useIntelliSenseInDebugging: boolean;
  useDebugDirective: boolean | DebugDirectiveConfig;
  useAutoJumpToError: boolean;
  useUIAVersion?: boolean;
  useOutputDebug?: boolean | OutputDebugConfig;
  useAnnounce?: boolean | AnnounceLevel;
  useLoadedScripts?: boolean | LoadedScriptsConfig;
  // #endregion feature configurations
}
export interface NormalizedDebugConfig extends DebugConfig {
  name: string;
  request: DebugRequest;
  runtimeArgs: string[];
  args: string[];
  port: number;
  hostname: string;

  variableCategories?: VariableCategory[];

  usePerfTips: false | PerfTipsConfig;
  useDebugDirective: false | DebugDirectiveConfig;
  useOutputDebug: false | OutputDebugConfig;
  useAnnounce: AnnounceLevel;
  useLoadedScripts: LoadedScriptsConfig;
}
