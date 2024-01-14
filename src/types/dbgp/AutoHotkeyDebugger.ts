/**
 * This file models the DBGP with reference to the following.
 * AutoHotkey: https://github.com/AutoHotkey/AutoHotkey/blob/v2.0/source/Debugger.cpp
 * AutoHotkey_H: https://github.com/HotKeyIt/ahkdll/tree/alpha
 */
import * as dbgp from './dbgp';

// #region data
// #region FileName
export type { FileName, FileUri, VirtualFileUri } from './dbgp';
// #endregion FileName

// #region Stream
export type { StreamType, Encoding } from './dbgp';
// #endregion Stream

// #region Status
export type { RunState, StatusReason } from './dbgp';
// #endregion Status

// #region Command
// https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L43
export type CommandName
  = dbgp.ContinuationCommandName
  | 'status'
  | dbgp.StackCommandName
  | dbgp.ContextCommandName
  | dbgp.PropertyCommandName
  | 'feature_get'
  | 'feature_set'
  | dbgp.BreakpointCommandName
  | 'stdout'
  | 'stderr'
  | 'typemap_get'
  | 'source'
  | ExtendedCommandName;

export type {
  BreakpointCommandName,
  StackCommandName,
  ContextCommandName,
  PropertyCommandName,
} from './dbgp';

export type ExtendedCommandName = 'break';

export type {
  RequireContinuationCommandName,
  OptionalContinuationCommandName,
  ContinuationCommandName,
} from './dbgp';
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

export interface Features {
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
  breakpointTypes?: {
    line: boolean;
    exception: boolean;
  };

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

// #region Breakpoint
export type BreakpointType = 'line' | 'exception';
export type {
  BreakpointState,
  Breakpoint,
  LineBreakpoint,
  FunctionBreakpoint,
  ExceptionBreakpoint,
} from './dbgp';
// #endregion Breakpoint

// #region Stack
export type StackType = 'file';
export type {
  LineNumber,
  CharacterNumber,
  CmdRange,
} from './dbgp';
export interface Stack {
  level: number;
  type: StackType;
  fileName: dbgp.FileName;
  line: number;
  where?: string;
  cmdbegin?: dbgp.CmdRange;
  cmdend?: dbgp.CmdRange;
}
// #endregion Stack

// #region Context
export type ContextNames = 'Local' | 'Global' | 'Static';
export interface Context {
  id: number;
  name: ContextNames;
}
// #endregion Context

// #region TypeMap
export type DataTypeName = string;
export type DataType = 'undefined' | 'string' | 'integer' | 'float';
export interface TypeMap {
  name: DataTypeName;
  type: DataType;
}
// #endregion TypeMap

// #region Property
export type PropertyFacet = '' | 'Alias' | 'Builtin' | 'Static' | 'ClipboardAll';
export type Property = PrimitiveProperty | ObjectProperty;
export interface PropertyBase {
  name: string;
  fullName: string;
  type: DataType;
  constant: boolean;
  facet?: PropertyFacet;
  size: number;
  key?: number;
  address: number;
  encoding: dbgp.Encoding;
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
export type { OutputControl } from './dbgp';
// #endregion StdOut StdErr

// #region StdIn
// (not support)
// #endregion StdOut StdErr

// #region SpawnPoint
// (not support)
// #endregion SpawnPoint

// #region Error
export type {
  ErrorNumber,
  ResponceError,
} from './dbgp';
// #endregion Error

// #region Version
export type DecimalNumber = number;
export type FloatNumber = number;
export type MejorVersion = FloatNumber | DecimalNumber;
export type MinorVersion = DecimalNumber;
export type PatchVersion = DecimalNumber;
export type PreReleaseVersion = DecimalNumber;
export type PreReleaseId = 'alpha' | 'beta' | 'rc';
// v1: x.x.y.z | v2: x.y.z
export type AutoHotkeyVersion = `${MejorVersion}.${MinorVersion}.${PatchVersion}` | (string & { ThisIsLiteralUnionTrick: any });
export interface ParsedAutoHotkeyVersion {
  full: AutoHotkeyVersion;
  mejor: MejorVersion;
  minor: MinorVersion;
  patch: PatchVersion;
  preId: PreReleaseId;
  preRelease: PreReleaseVersion;
}
export type ParseAutoHotkeyVersion = (a: AutoHotkeyVersion | ParsedAutoHotkeyVersion, b: AutoHotkeyVersion | ParsedAutoHotkeyVersion) => ParsedAutoHotkeyVersion;
export type AutoHotkeyVersionCompare = (a: AutoHotkeyVersion | ParsedAutoHotkeyVersion, b: AutoHotkeyVersion | ParsedAutoHotkeyVersion) => number;
// #endregion Version
// #endregion data

// #region Packet
export type {
  PacketName,
  Packet,
} from './dbgp';
export interface InitPacket {
  init: InitResponce;
}
export type {
  StreamPacket,
  ResponcePacket,
} from './dbgp';
// #endregion Packet

// #region Responce
// https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L2369C8-L2369C8
// https://github.com/HotKeyIt/ahkdll/blob/6d186f5f7eced1b252bfc66eb9b361ff03aa3c0c/source/Debugger.cpp#L2300
export interface InitResponce {
  fileName: dbgp.FileName;
  appId: AppId;
  ideKey: FloatNumber;
  session: FloatNumber;
  thread: DecimalNumber;
  parent: DebuggerParent;
  language: LanguageName;
  protocolVersion: ProtocolVersion;
}

export type {
  StreamResponce,
  CommandResponce,
} from './dbgp';

// https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L482
export interface FeatureGetResponse extends dbgp.CommandResponseBase {
  command: 'feature_get';
  featureName: FeatureName;
  supported: boolean;
}

// https://github.com/AutoHotkey/AutoHotkey/blob/31de9087734f049c82c790b79e6c51316cb575f4/source/Debugger.cpp#L538
export interface FeatureSetResponse extends dbgp.CommandResponseBase {
  command: 'feature_set';
  featureName: FeatureName;
  success: boolean;
}

export type {
  ContinuationResponse,
  BreakpointGetResponce,
  BreakpointSetResponce,
  BreakpointUpdateResponce,
  BreakpointRemoveResponce,
  BreakpointListResponce,
  StackDepthResponce,
} from './dbgp';

export interface StackGetResponce extends dbgp.CommandResponseBase {
  command: 'stack_get';
  stacks: Stack[];
}

export interface ContextNamesResponce extends dbgp.CommandResponseBase {
  command: 'context_names';
  contexts: Context[];
}
export interface ContextGetResponce extends dbgp.CommandResponseBase {
  command: 'context_get';
  context: Context;
}
export type {
  TypeMapGetResponce,
  PropertySetResponse,
} from './dbgp';

export interface PropertyGetResponse extends dbgp.CommandResponseBase {
  command: 'property_get';
  property: Property;
}

export type {
  PropertyValueResponse,
  SourceResponce,
  StdOutResponce,
  StdErrResponce,
  BreakResponce,
} from './dbgp';
// #endregion Responce

// #region client
export type CommandSession = RequireCommandSession | ExtendedCommandSession;
export interface RequireCommandSession {
  sendStatusCommand: () => Promise<dbgp.StatusResponse>;                                                                                                      // $ status -i TRANSACTION_ID
  sendFeatureGetCommand: (featureName: FeatureName) => Promise<FeatureSetResponse>;                                                                           // $ feature_get -i TRANSACTION_ID -n FEATURE_NAME
  sendFeatureSetCommand: (featureName: FeatureName, value: string) => Promise<FeatureSetResponse>;                                                            // $ feature_set -i TRANSACTION_ID -n FEATURE_NAME -v VALUE
  sendRunCommand: () => Promise<dbgp.ContinuationResponse>;                                                                                                   // $ run -i TRANSACTION_ID
  sendStepIntoCommand: () => Promise<dbgp.ContinuationResponse>;                                                                                              // $ step_into -i TRANSACTION_ID
  sendStepOverCommand: () => Promise<dbgp.ContinuationResponse>;                                                                                              // $ step_over -i transaction_id
  sendStepOutCommand: () => Promise<dbgp.ContinuationResponse>;                                                                                               // $ step_out -i TRANSACTION_ID
  sendStopCommand: () => Promise<dbgp.ContinuationResponse>;                                                                                                  // $ stop -i TRANSACTION_ID
  sendDetachCommand: () => Promise<dbgp.ContinuationResponse>;                                                                                                // $ detach -i TRANSACTION_ID
  sendBreakpointGetCommand: () => Promise<dbgp.BreakpointGetResponce>;                                                                                        // $ breakpoint_get -i TRANSACTION_ID -d BREAKPOINT_ID
  sendBreakpointSetCommand: (fileName: dbgp.FileName, line: dbgp.LineNumber, condition?: dbgp.Condition) => Promise<dbgp.BreakpointSetResponce>;              // $ breakpoint_set -i TRANSACTION_ID -t "line" -s STATE -f FILE_NAME -n LINE_NUMBER
  sendExceptionBreakpointSetCommand: (exception: string) => Promise<dbgp.BreakpointSetResponce>;                                                              // $ breakpoint_set -i TRANSACTION_ID -t "exception" -s STATE -x EXCEPTION_NAME
  sendBreakpointUpdateCommand: (breakpointId: dbgp.BreakpointId) => Promise<dbgp.BreakpointUpdateResponce>;                                                   // $ breakpoint_update -i TRANSACTION_ID -d BREAKPOINT_ID
  sendBreakpointRemoveCommand: (breakpointId: dbgp.BreakpointId) => Promise<dbgp.BreakpointRemoveResponce>;                                                   // $ breakpoint_remove -i TRANSACTION_ID -d BREAKPOINT_ID
  sendBreakpointListCommand: () => Promise<dbgp.BreakpointListResponce>;                                                                                      // $ breakpoint_list -i TRANSACTION_ID
  sendStackDepthCommand: () => Promise<dbgp.StackDepthResponce>;                                                                                              // $ stack_depth -i TRANSACTION_ID
  sendStackGetCommand: (stackDepth?: number) => Promise<StackGetResponce>;                                                                                    // $ stack_get -i TRANSACTION_ID [ -d STACK_DEPTH ]
  sendContextNamesCommand: (stackDepth?: number) => Promise<ContextNamesResponce>;                                                                            // $ context_names -i TRANSACTION_ID [ -d STACK_DEPTH ]
  sendContextGetCommand: (contextId?: dbgp.ContextId, depth?: number) => Promise<ContextGetResponce>;                                                         // $ context_get -i TRANSACTION_ID [ -d STACK_DEPTH -c CONTEXT_NUMBER ]
  sendTypeMapGetCommand: () => Promise<dbgp.TypeMapGetResponce>;                                                                                              // $ typemap_get -i TRANSACTION_ID
  sendPropertyGetCommand: (propertyLongName: string, depth?: number) => Promise<dbgp.PropertyGetResponse>;                                                    // $ property_get -i TRANSACTION_ID -n PROPERTY_LONG_NAME [ -d STACK_DEPTH ]
  sendPropertySetCommand: (propertyLongName: string, depth?: number) => Promise<dbgp.PropertySetResponse>;                                                    // $ property_set -i TRANSACTION_ID -n PROPERTY_LONG_NAME -l DATA_LENGTH [ -d STACK_DEPTH ] -- DATA
  sendPropertyValueCommand: (propertyLongName: string, depth?: number) => Promise<dbgp.PropertyValueResponse>;                                                // $ property_value -i TRANSACTION_ID -n PROPERTY_LONG_NAME [ -d STACK_DEPTH ]
  sendSourceCommand: (fileName: dbgp.FileName) => Promise<dbgp.SourceResponce>;                                                                               // $ source -i TRANSACTION_ID -f FILEURI
  sendStdOutCommand: (outputControl: dbgp.OutputControl) => Promise<dbgp.StdOutResponce>;                                                                     // $ stdout -i transaction_id -c OUTPUT_CONTROL
  sendStdErrCommand: (outputControl: dbgp.OutputControl) => Promise<dbgp.StdOutResponce>;                                                                     // $ stderr -i transaction_id -c OUTPUT_CONTROL
}
export interface ExtendedCommandSession {
  sendBreakCommand: () => Promise<dbgp.BreakResponce>; // $ break -i TRANSACTION_ID
}
// #endregion client
