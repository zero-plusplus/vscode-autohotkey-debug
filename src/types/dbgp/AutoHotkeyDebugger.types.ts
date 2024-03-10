/**
 * This file models the DBGP with reference to the following.
 * AutoHotkey: https://github.com/AutoHotkey/AutoHotkey/blob/v2.0/source/Debugger.cpp
 * AutoHotkey_H: https://github.com/HotKeyIt/ahkdll/tree/alpha
 */
// #region data

import { AutoHotkeyVersion } from '../tools/autohotkey/version/common.types';

// #region FileName
export type FileName = FileUri | VirtualFileUri;
export type FileUri = `${'file://'}${string}`;
export type VirtualFileUri = `${'dbgp://'}${string}`;
// #endregion FileName

// #region Stream
export type StreamType = 'stdout' | 'stderr';
export type Encoding = 'base64' | (string & { ThisIsLiteralUnionTrick: any });
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
// https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L43
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
// https://github.com/AutoHotkey/AutoHotkey/blob/2a836cf2815ec947f70b18df3b79699a9dcf92e9/source/ahkversion.h#L2
// https://github.com/HotKeyIt/ahkdll/blob/818386f5af7e6000d945801838d4e80a9e530c0d/source/defines.h#L34
export type AppId = 'AutoHotkey';

// https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L2369C8-L2369C8
// https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L2300
export type ProtocolVersion = '1.0' | (string & { ThisIsLiteralUnionTrick: any });

// https://github.com/AutoHotkey/AutoHotkey/blob/2a836cf2815ec947f70b18df3b79699a9dcf92e9/source/Debugger.h#L36
// https://github.com/HotKeyIt/ahkdll/blob/818386f5af7e6000d945801838d4e80a9e530c0d/source/Debugger.h#L36
export type LanguageName = AppId;

// https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L2369C8-L2369C8
// https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L2300
export type DebuggerParent = '';

// https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L482
// https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L411
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
  // https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L495
  // https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L424
  languageSupportsThreads?: boolean;

  // https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L497
  // https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L426
  languageName?: LanguageName;

  // https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L499
  // https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L428
  languageVersion?: AutoHotkeyVersion;

  // https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L501
  // https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L430
  encoding?: 'UTF-8';

  // https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L501
  // https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L433
  protocolVersion?: ProtocolVersion;

  // https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L501
  // https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L433
  supportsAsync?: boolean;

  // https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L508
  // https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L437
  breakpointTypes?: Record<BreakpointType, boolean>;

  // https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L510
  // https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L439
  multipleSessions: boolean;

  // https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L512
  // https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L441C13-L441C18
  maxData: number;

  // https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L514C6-L514C6
  // https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L443
  maxChildren: number;

  // https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L516
  // https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L445
  maxDepth: number;
}
// #endregion Feature

// #region Stack
export type StackType = 'file';
export interface Stack {
  level: number;
  type: StackType;
  fileName: FileName;
  line: number;
  where?: string;
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
  response: CommandResponse;
}
// #endregion Packet

// #region Response
// https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L2369C8-L2369C8
// https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L2300
export interface InitResponse {
  fileName: FileName;
  appId: AppId;
  ideKey: number;
  session: number;
  thread: number;
  parent: DebuggerParent;
  language: LanguageName;
  protocolVersion: ProtocolVersion;
}
export interface StreamResponse {
  type: StreamType;
  encoding: Encoding;
  content: string;
}
export interface CommandResponseBase {
  command: string;
  error?: ErrorResponse;
}
export interface AttributeBase {
  command: CommandName;
  transaction_id: string;
}

export interface ErrorResponse {
  attributes: {
    code: string;
  };
}
export type CommandResponse =
  // | StatusResponse
  // | FeatureGetResponse
  // | FeatureSetResponse
  | ContinuationResponse
  | BreakpointGetResponse
  | BreakpointSetResponse
  | BreakpointRemoveResponse
  // | BreakpointListResponse
  | StackDepthResponse
  | StackGetResponse;
  // | ContextNamesResponse
  // | ContextGetResponse
  // | PropertyGetResponse
  // | PropertySetResponse
  // | PropertyValueResponse
  // | SourceResponse
  // | StdOutResponse
  // | StdErrResponse;

export interface StatusAttributes extends CommandResponseBase {
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
  featureName: FeatureName;
  success: boolean;
}
export interface ContinuationResponse extends CommandResponseBase {
  attributes: {
    command: ContinuationCommandName;
    reason: StatusReason;
    status: RunState;
  } & AttributeBase & StatusAttributes;
}
export type BreakpointId = number;
export type BreakpointType = 'line' | 'exception';
export type BreakpointState = 'enabled' | 'disabled';
export interface BreakpointSetResponse extends CommandResponseBase {
  attributes: {
    command: 'breakpoint_set';
    id: string;
    state: BreakpointState;
    resolved: boolean;
  } & AttributeBase;
}
export interface BreakpointGetResponse extends CommandResponseBase {
  attributes: {
    command: 'breakpoint_get';
  } & AttributeBase;
  breakpoint: {
    attributes: {
      id: string;
      filename: string;
      lineno: string;
      state: BreakpointState;
      type: BreakpointType;
    };
  };
}
// export interface BreakpointUpdateResponse extends CommandResponseBase {
//   command: 'breakpoint_update';
// }
export interface BreakpointRemoveResponse extends CommandResponseBase {
  attributes: {
    command: 'breakpoint_remove';
  } & AttributeBase;
}
export interface BreakpointListResponse extends CommandResponseBase {
  command: 'breakpoint_list';
  breakpoints: any[];
}
export interface StackDepthResponse extends CommandResponseBase {
  attributes: {
    command: 'stack_depth';
    depth: string;
  } & AttributeBase;
}
export interface StackFrame {
  attributes: {
    filename: string;
    level: string;
    lineno: string;
    type: StackType;
    where: string;
  };
}
export interface StackGetResponse extends CommandResponseBase {
  attributes: {
    command: 'stack_get';
  } & AttributeBase;
  stack: StackFrame | StackFrame[];
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
