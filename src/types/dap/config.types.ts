import { DebugProtocol } from '@vscode/debugprotocol';
import { BreakpointDataArray } from '../tools/autohotkey/runtime/breakpoint.types';
import { VariableCategory } from './variableCategory.types';
import { PerfTipsConfig } from './perftips.types.';
import { LoadedScriptsConfig } from './loadedScripts.types';
import { LiteralUnion } from 'type-fest';
import { DebugDirectiveConfig } from '../client/config/attributes/useDebugDirective.types';
import { OutputDebugConfig } from '../client/config/attributes/useOutputDebug.types';
import { AnnounceLevel } from '../client/config/attributes/useAnnounce.types';

export type AttributeType = LiteralUnion<'string' | 'number' | 'boolean' | 'object' | 'string[]' | 'number[]' | 'boolean[]', string>;
export interface AttributeCheckerFactoryUtils {
  getLanguageId?: (programPath: string) => Promise<string>;
  getCurrentFile?: () => Promise<string | undefined>;
  warning?: (message: string) => Promise<void>;
  error?: (err: Error) => Promise<void>;
}
export type AttributeCheckerFactory = <K extends keyof DebugConfig>(attributeName: K, utils?: AttributeCheckerFactoryUtils) => AttributeChecker<K>;
export interface AttributeChecker<K extends keyof DebugConfig> {
  utils: AttributeCheckerFactoryUtils;
  rawConfig: DebugConfig;
  get: () => DebugConfig[K];
  getByName: <K extends keyof DebugConfig>(attributeName: K) => DebugConfig[K];
  isValid: boolean;
  getDependency: <NK extends keyof DebugConfig>(dependedAttributeName: NK) => DebugConfig[NK];
  markValidated: (value?: DebugConfig[K]) => void;
  markValidatedPath: (value?: DebugConfig[K]) => void;
  warning: (message: string) => void;
  throwFormatError: (format: string) => void;
  throwValueError: (expectedValueOrValues: string | string[]) => void;
  throwTypeError: (expectedTypeOrTypes: AttributeType | AttributeType[]) => void;
  throwFileNotFoundError: (filePath?: string) => void;
}
export type AttributeValidator = (createChecker: AttributeCheckerFactory) => Promise<void>;
export type DebugConfigValidator = (config: DebugConfig, callback?: (err: Error) => void) => Promise<DebugConfig>;

export type DebugRequest = 'launch' | 'attach';
export interface DebugConfig extends DebugProtocol.LaunchRequestArguments, DebugProtocol.AttachRequestArguments {
  // #region basic configurations
  name: string;
  type: 'autohotkey';
  request: DebugRequest;
  stopOnEntry: boolean;
  skipFunctions?: string[];
  skipFiles?: string[];
  trace: boolean;

  // #region launcher configurations
  runtime: string;
  runtimeArgs: string[];
  program: string;
  args: string[];
  port: number;
  hostname: string;
  noDebug: boolean;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  maxChildren: number;
  // #endregion lancher configurations
  // #region basic configurations

  // #region custom configurations
  openFileOnExit?: string;
  variableCategories: false | VariableCategory[];
  setBreakpoints?: BreakpointDataArray;
  // #endregion custom configurations

  // #region feature configurations
  usePerfTips: false | PerfTipsConfig;
  useIntelliSenseInDebugging: boolean;
  useDebugDirective?: DebugDirectiveConfig;
  useAutoJumpToError: boolean;
  useUIAVersion: boolean;
  useOutputDebug: false | OutputDebugConfig;
  useAnnounce: false | AnnounceLevel;
  useLoadedScripts: false | LoadedScriptsConfig;
  // #endregion feature configurations

  // #region internal
  /**
   * This value is used during normalization.
   * The path of the file that the editor currently open.
   * @internal
   */
  __filename?: string;
  /**
   * This value is used during normalization.
   * The language id of the file that the editor currently open.
   * @internal
   */
  __languageId?: 'ahk' | 'ahk2' | 'ah2' | 'ahkh' | 'ahkh2';
  // #endregion internal
}
