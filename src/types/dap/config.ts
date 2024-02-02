import { DebugProtocol } from '@vscode/debugprotocol';
import { BreakpointDataArray } from './breakpoint';
import { VariableCategory } from './variableCategory';
import { PerfTipsConfig } from './perftips';
import { LoadedScriptsConfig } from './loadedScripts';
import { AnnounceLevel, DebugDirectiveConfig, OutputDebugConfig } from './adapter';
import { LiteralUnion } from 'type-fest';

export type AttributeType = LiteralUnion<'string' | 'number' | 'boolean' | 'object' | 'string[]' | 'number[]' | 'boolean[]', string>;
export interface AttributeCheckerFactoryUtils {
  getLanguageId?: (programPath: string) => Promise<string>;
  getCurrentFile?: () => Promise<string>;
}
export type AttributeCheckerFactory = <K extends keyof DebugConfig>(attributeName: K, utils?: AttributeCheckerFactoryUtils) => AttributeChecker<K>;
export interface AttributeChecker<K extends keyof DebugConfig> {
  utils?: AttributeCheckerFactoryUtils;
  rawConfig: DebugConfig;
  get: () => DebugConfig[K];
  ref: <K extends keyof DebugConfig>(attributeName: K) => DebugConfig[K];
  isValid: boolean;
  getDependency: <NK extends keyof NormalizedDebugConfig>(dependedAttributeName: NK) => NormalizedDebugConfig[NK];
  markValidated: (value?: DebugConfig[K]) => void;
  throwWarningError: (message: string) => void;
  throwValueError: (expectedValueOrValues: string | string[]) => void;
  throwTypeError: (expectedTypeOrTypes: AttributeType | AttributeType[]) => void;
  throwFileNotFoundError: (filePath?: string) => void;
}
export type AttributeValidator = (createChecker: AttributeCheckerFactory) => Promise<void>;

export type DebugConfigValidator = (config: DebugConfig, callback?: (err: Error) => void) => Promise<NormalizedDebugConfig>;
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
  runtime?: string;
  runtime_v1?: string;
  runtime_v2?: string;
  runtimeArgs?: string[];
  runtimeArgs_v1?: string[];
  runtimeArgs_v2?: string[];
  program?: string;
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
export interface NormalizedDebugConfig extends Omit<DebugConfig, 'runtime_v1' | 'runtime_v2' | 'runtimeArgs_v1' | 'runtimeArgs_v2'> {
  name: string;
  request: DebugRequest;
  runtimeArgs: string[];
  args: string[];
  port: number;
  hostname: string;

  runtime: string;
  program: string;

  variableCategories?: VariableCategory[];

  usePerfTips: false | PerfTipsConfig;
  useDebugDirective: false | DebugDirectiveConfig;
  useOutputDebug: false | OutputDebugConfig;
  useAnnounce: AnnounceLevel;
  useLoadedScripts: LoadedScriptsConfig;
}
