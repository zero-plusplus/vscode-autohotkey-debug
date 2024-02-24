import { DebugProtocol } from '@vscode/debugprotocol';
import { BreakpointDataArray } from './runtime/breakpoint.types';
import { VariableCategory } from './variableCategory.types';
import { PerfTipsConfig } from './perftips.types.';
import { LoadedScriptsConfig } from './loadedScripts.types';
import { AnnounceLevel, DebugDirectiveConfig, OutputDebugConfig } from './adapter.types';
import { LiteralUnion } from 'type-fest';

export type AttributeType = LiteralUnion<'string' | 'number' | 'boolean' | 'object' | 'string[]' | 'number[]' | 'boolean[]' | 'object', string>;
export interface AttributeCheckerFactoryUtils {
  getLanguageId?: (programPath: string) => Promise<string>;
  getCurrentFile?: () => Promise<string>;
  warning?: (message: string) => Promise<void>;
}
export type AttributeCheckerFactory = <K extends keyof DebugConfig>(attributeName: K, utils?: AttributeCheckerFactoryUtils) => AttributeChecker<K>;
export interface AttributeChecker<K extends keyof DebugConfig> {
  utils: AttributeCheckerFactoryUtils;
  rawConfig: DebugConfig;
  get: () => DebugConfig[K];
  ref: <K extends keyof DebugConfig>(attributeName: K) => DebugConfig[K];
  isValid: boolean;
  getDependency: <NK extends keyof NormalizedDebugConfig>(dependedAttributeName: NK) => NormalizedDebugConfig[NK];
  markValidated: (value?: DebugConfig[K]) => void;
  markValidatedPath: (value?: DebugConfig[K]) => void;
  warning: (message: string) => void;
  throwFormatError: (format: string) => void;
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
  stopOnEntry?: boolean;
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
  port?: number | `${number}-${number}`;
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

  // #region feature configurations
  usePerfTips?: boolean | PerfTipsConfig;
  useIntelliSenseInDebugging?: boolean;
  useDebugDirective?: boolean | DebugDirectiveConfig;
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
  stopOnEntry: boolean;
  port: number;
  hostname: string;

  runtime: string;
  runtimeArgs: string[];
  program: string;
  args: string[];

  variableCategories?: VariableCategory[];

  usePerfTips: false | PerfTipsConfig;
  useIntelliSenseInDebugging: boolean;
  useDebugDirective: false | DebugDirectiveConfig;
  useOutputDebug: false | OutputDebugConfig;
  useAnnounce: AnnounceLevel;
  useLoadedScripts: LoadedScriptsConfig;
}
