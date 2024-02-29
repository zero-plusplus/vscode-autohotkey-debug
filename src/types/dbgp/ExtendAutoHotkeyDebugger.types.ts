/**
 * This file models a virtual debugger that pseudo-extends the features supported by DBGP but not by the AutoHotkey debugger.
 */
import { LiteralUnion } from 'type-fest';

// #region data
// #region Version
export type DecimalNumber = number;
export type FloatNumber = number;
export type MejorVersion = FloatNumber | DecimalNumber;
export type MinorVersion = DecimalNumber;
export type PatchVersion = DecimalNumber;
export const preIdList = [ 'alpha', 'beta', 'rc' ] as const;
export type PreReleaseId = LiteralUnion<typeof preIdList[number], string>;
export type PreReleaseVersion = DecimalNumber;
// v1: x.x.y.z | v2: x.y.z
export type PreAutoHotkeyVersion = LiteralUnion<`${PreReleaseId}.${PreReleaseVersion}`, string>;
export type AutoHotkeyVersion = LiteralUnion<`${MejorVersion}.${MinorVersion}.${PatchVersion}` | `${MejorVersion}.${MinorVersion}.${PatchVersion}-${PreAutoHotkeyVersion}`, string>;
export type ParsedAutoHotkeyVersion
  = ParsedAutoHotkeyReleasedVersion
  | ParsedAutoHotkeyPreReleasedVersion;
export interface ParsedAutoHotkeyReleasedVersion {
  raw: AutoHotkeyVersion;
  version: AutoHotkeyVersion;

  mejor: MejorVersion;
  minor: MinorVersion;
  patch: PatchVersion;
}
export interface ParsedAutoHotkeyPreReleasedVersion extends ParsedAutoHotkeyReleasedVersion {
  preversion: PreAutoHotkeyVersion;
  preId: PreReleaseId;
  preRelease: PreReleaseVersion;
}
export type ParseAutoHotkeyVersion = (a: AutoHotkeyVersion | ParsedAutoHotkeyVersion, b: AutoHotkeyVersion | ParsedAutoHotkeyVersion) => ParsedAutoHotkeyVersion;
export type AutoHotkeyVersionCompare = (a: AutoHotkeyVersion | ParsedAutoHotkeyVersion, b: AutoHotkeyVersion | ParsedAutoHotkeyVersion) => number;
// #endregion Version

// #region FileName
export type FileName = FileUri | VirtualFileUri;
export type FileUri = `${'file://'}${string}`;
export type VirtualFileUri = `${'dbgp://'}${string}`;
// #endregion FileName

// #region Stream
export type StreamType = 'stdout' | 'stderr';
export type Encoding = LiteralUnion<'base64', string>;
// #endregion Stream

// #region Status
export type RunState
  = 'starting'
  | 'stopping'
  | 'stopped'
  | 'running'
  | 'break';
export type StatusReason = 'ok' | 'error' | 'aborted' | 'exception';
// #endregion Status

// #region Command
export type CommandName
  = ContinuationCommandName
  | 'status'
  | StackCommandName
  | ContextCommandName
  | PropertyCommandName
  | 'feature_get'
  | 'feature_set'
  | BreakpointCommandName
  | 'stdout'
  | 'stderr'
  | 'typemap_get'
  | 'source'
  | ExtendedCommandName;

export type RequireContinuationCommandName
  = 'run'
  | 'step_into'
  | 'step_over'
  | 'step_out'
  | 'stop';
export type OptionalContinuationCommandName = 'detach';
export type ContinuationCommandName = RequireContinuationCommandName | OptionalContinuationCommandName;

export type BreakpointCommandName
  = 'breakpoint_set'
  | 'breakpoint_get'
  | 'breakpoint_update'
  | 'breakpoint_remove'
  | 'breakpoint_list';
export type StackCommandName
  = 'stack_depth'
  | 'stack_get';
export type ContextCommandName
  = 'context_names'
  | 'context_get';
export type PropertyCommandName
  = 'property_get'
  | 'property_set'
  | 'property_value';
export type ExtendedCommandName = 'break';
// #endregion Command

// #region Feature
export type AppId = 'AutoHotkey';
export type ProtocolVersion = LiteralUnion<'1.0', string>;
export type LanguageName = AppId;
export type DebuggerParent = '';

export type FeatureName
  = 'language_supports_threads'
  | 'language_name'
  | 'language_version'
  | 'encoding'
  | 'protocol_version'
  | 'supports_async'
  | 'breakpoint_types'
  | 'multiple_sessions'
  | 'max_children'
  | 'max_data'
  | 'max_depth';

export interface FeatureRecord {
  languageSupportsThreads?: boolean;
  languageName?: LanguageName;
  languageVersion?: AutoHotkeyVersion;
  encoding?: 'UTF-8';
  protocolVersion?: ProtocolVersion;
  supportsAsync?: boolean;
  breakpointTypes?: Record<BreakpointType, boolean>;
  multipleSessions: boolean;
  maxData: number;
  maxChildren: number;
  maxDepth: number;
}
// #endregion Feature

// #region Breakpoint
export type BreakpointId = DecimalNumber;
export type BreakpointType = 'line' | 'call' | 'return' | 'exception' | 'conditional';
export type BreakpointState = 'enabled' | 'disabled';
export type Condition = ExpressionCondition | HitCondition | (ExpressionCondition & HitCondition);
export type Expression = string;
export type ExpressionCondition = { expression: Expression };
export type HitConditionOperator = '>=' | '==' | '%';
export type HitCondition = { operator?: HitConditionOperator; value: Expression };
export interface BreakpointBase {
  type: BreakpointType;
  id: number;
  state: boolean;
  temporary: boolean;
  readonly resolved: boolean;
  hitCount?: string;
  hitValue?: number;
  hitCondition?: string;
}
export type Breakpoint
  = LineBreakpoint
  | FunctionBreakpoint
  | ReturnBreakpoint
  | ExceptionBreakpoint
  | ConditionalBreakpoint;
export interface LineBreakpoint extends BreakpointBase {
  type: 'line';
  fileName: string;
  line: DecimalNumber;
}
export interface CallBreakpoint extends BreakpointBase {
  type: 'call';
  functionName: string;
}
export type FunctionBreakpoint = CallBreakpoint;
export interface ReturnBreakpoint extends BreakpointBase {
  type: 'return';
  functionName: string;
}
export interface ExceptionBreakpoint extends BreakpointBase {
  type: 'exception';
  exception: string;
}
export interface ConditionalBreakpoint extends BreakpointBase {
  type: 'conditional';
  fileName: FileName;
  expressionType: 'conditional';
  expression: string;
}
// #endregion Breakpoint

// #region Stack
export type StackType = 'file';
export type LineNumber = DecimalNumber;
export type CharacterNumber = DecimalNumber;
export type CmdRange = `${LineNumber}:${CharacterNumber}`;
export interface Stack {
  level: number;
  type: StackType;
  fileName: FileName;
  line: number;
  where?: string;
  cmdbegin?: CmdRange;
  cmdend?: CmdRange;
}
// #endregion Stack

// #region Context
export const enum ContextId {
  Local = 0,
  Global = 1,
  Static = 2,
}
export type ContextName = 'Local' | 'Global' | 'Static';
export interface Context {
  id: ContextId;
  name: ContextName;
}
// #endregion Context

// #region TypeMap
export type DataTypeName = 'string' | 'integer' | 'float';
export type DataType = 'string' | 'int' | 'float' | 'object';
export interface TypeMap {
  name: DataTypeName;
  type: DataType;
}
// #endregion TypeMap

// #region Property
export type UndefinedType = 'undefined';
export type PropertyFacet = '' | 'Alias' | 'Builtin' | 'Static' | 'ClipboardAll';
export type Property = PrimitiveProperty | ObjectProperty;
export interface PropertyBase {
  name: string;
  fullName: string;
  type: DataType | UndefinedType;
  constant: boolean;
  facet?: PropertyFacet;
  size: number;
  key?: number;
  address: number;
  encoding: Encoding;
}
export type Primitive = string | number;
export interface PrimitiveProperty extends PropertyBase {
  value: string;
}
export interface ObjectProperty extends PropertyBase {
  className: string;
  page: number;
  pageSize: number;
  hasChildren: boolean;
  children: Property[];
  numChildren?: number;
}
// #endregion Property

// #region StdOut StdErr
export const enum OutputControl {
  Disable = 0,
  Copy = 1,
  Redirect = 2,
}
// #endregion StdOut StdErr

// #region StdIn
// (not support)
// #endregion StdOut StdErr

// #region SpawnPoint
// (not support)
// #endregion SpawnPoint

// #region Error
// https://xdebug.org/docs/dbgp#error-codes
export const commandParsingErrorNumbers = [
  0,        // > no error
  1,        // > parse error in command
  2,        // > duplicate arguments in command
  3,        // > invalid options (ie, missing a required option, invalid value for a passed option, not supported feature)
  4,        // > Unimplemented command
  5,        // > Command not available (Is used for async commands. For instance if the engine is in state "run" then only "break" and "status" are available).
] as const;
export const fileRelatedErrorNumbers = [
  100,      // > can not open file (as a reply to a "source" command if the requested source file can't be opened)
  101,      // > stream redirect failed
] as const;
export const breakpointOrCodeflowErrorNumbers = [
  200,      // > breakpoint could not be set (for some reason the breakpoint could not be set due to problems registering it)
  201,      // > breakpoint type not supported (for example I don't support 'watch' yet and thus return this error)
  202,      // > invalid breakpoint (the IDE tried to set a breakpoint on a line that does not exist in the file (ie "line 0" or lines past the end of the file)
  203,      // > no code on breakpoint line (the IDE tried to set a breakpoint on a line which does not have any executable code. The debugger engine is NOT required to return this type if it is impossible to determine if there is code on a given location. (For example, in the PHP debugger backend this will only be returned in some special cases where the current scope falls into the scope of the breakpoint to be set)).
  204,      // > Invalid breakpoint state (using an unsupported breakpoint state was attempted)
  205,      // > No such breakpoint (used in breakpoint_get etc. to show that there is no breakpoint with the given ID)
  206,      // > Error evaluating code (use from eval() (or perhaps property_get for a full name get))
  207,      // > Invalid expression (the expression used for a non-eval() was invalid)
] as const;
export const dataErrorNumbers = [
  300,      // > Can not get property (when the requested property to get did not exist, this is NOT used for an existing but uninitialized property, which just gets the type "uninitialised" (See: PreferredTypeNames)).
  301,      // > Stack depth invalid (the -d stack depth parameter did not exist (ie, there were less stack elements than the number requested) or the parameter was < 0)
  302,      // > Context invalid (an non existing context was requested)
] as const;
export const protocolErrorNumbers = [
  900,      // > Encoding not supported
  998,      // > An internal exception in the debugger occurred
  999,      // > Unknown error
] as const;
export const errorNumbers = [
  ...commandParsingErrorNumbers,
  ...fileRelatedErrorNumbers,
  ...breakpointOrCodeflowErrorNumbers,
  ...dataErrorNumbers,
  ...protocolErrorNumbers,
] as const;
export type ErrorNumber = typeof errorNumbers[number];
export interface ResponseError {
  code: ErrorNumber;
}
// #endregion Error
// #endregion data

// #region Packet
export type PacketName = 'init' | 'stream' | 'response';
export type Packet = InitPacket | StreamPacket | ResponsePacket;
export interface InitPacket {
  init: { attributes: InitResponse };
}
export interface StreamPacket {
  stream: { attributes: StreamResponse };
}
export interface ResponsePacket {
  response: { attributes: CommandResponse };
}
// #endregion Packet

// #region Response
export interface InitResponse {
  appid: AppId;
  ide_key: '';
  session: '';
  thread: DecimalNumber;
  parent: '';
  language: LanguageName;
  protocol_version: ProtocolVersion;
  fileuri: FileName;
}
export interface StreamResponse {
  type: StreamType;
  encoding: Encoding;
  content: string;
}
export type CommandResponse
  = StatusResponse
  | FeatureGetResponse
  | FeatureSetResponse
  | ContinuationResponse
  | BreakpointGetResponse
  | BreakpointSetResponse
  | BreakpointUpdateResponse
  | BreakpointRemoveResponse
  | BreakpointListResponse
  | StackDepthResponse
  | StackGetResponse
  | ContextNamesResponse
  | ContextGetResponse
  | TypeMapGetResponse
  | PropertyGetResponse
  | PropertySetResponse
  | PropertyValueResponse
  | SourceResponse
  | StdOutResponse
  | StdErrResponse
  | BreakResponse;
export interface CommandResponseBase {
  command: CommandName;
  transaction_id: number;
  error?: ResponseError;
}

export interface StatusResponse extends CommandResponseBase {
  status: RunState;
  reason: StatusReason;
}
// https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L482
export interface FeatureGetResponse extends CommandResponseBase {
  command: 'feature_get';
  featureName: FeatureName;
  supported: boolean;
}

// https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L538
export interface FeatureSetResponse extends CommandResponseBase {
  command: 'feature_set';
  feature: FeatureName;
  success: '1' | '0';
}
export interface ContinuationResponse extends StatusResponse {
  command: ContinuationCommandName;
  breakpoint?: Breakpoint;
}
export interface BreakpointGetResponse extends CommandResponseBase {
  command: 'breakpoint_get';
  breakpoint: Breakpoint;
}
export interface BreakpointSetResponse extends CommandResponseBase {
  command: 'breakpoint_set';
  state: BreakpointState;
  resolved: boolean;
}
export interface BreakpointUpdateResponse extends CommandResponseBase {
  command: 'breakpoint_update';
}
export interface BreakpointRemoveResponse extends CommandResponseBase {
  command: 'breakpoint_remove';
}
export interface BreakpointListResponse extends CommandResponseBase {
  command: 'breakpoint_list';
  breakpoints: Breakpoint[];
}
export interface StackDepthResponse extends CommandResponseBase {
  command: 'stack_depth';
  depth: number;
}
export interface StackGetResponse extends CommandResponseBase {
  command: 'stack_get';
  stacks: Stack[];
}
export interface ContextNamesResponse extends CommandResponseBase {
  command: 'context_names';
  contexts: Context[];
}
export interface ContextGetResponse extends CommandResponseBase {
  command: 'context_get';
  context: Context;
}
export interface TypeMapGetResponse extends CommandResponseBase {
  types: TypeMap[];
}
export interface PropertySetResponse extends CommandResponseBase {
  command: 'property_set';
  success: boolean;
}
export interface PropertyGetResponse extends CommandResponseBase {
  command: 'property_get';
  property: Property;
}
export interface PropertyValueResponse extends CommandResponseBase {
  command: 'property_value';
  data: string;
  size: number;
  encoding: Encoding | 'none';
}
export interface SourceResponse extends CommandResponseBase {
  command: 'source';
  success: boolean;
  data: string;
}
export interface StdOutResponse extends CommandResponseBase {
  command: 'stdout';
  success: boolean;
}
export interface StdErrResponse extends CommandResponseBase {
  command: 'stderr';
  success: boolean;
}
export interface BreakResponse extends CommandResponseBase {
  command: 'break';
  success: boolean;
}
// #endregion Response
