/**
 * This file models a virtual debugger that pseudo-extends the features supported by DBGP but not by the AutoHotkey debugger.
 */
import * as dbgp from './dbgp';
import * as ahkdbg from './AutoHotkeyDebugger';

// #region data
// #region FileName
export type {
  FileName,
  FileUri,
  VirtualFileUri,
} from './AutoHotkeyDebugger';
// #endregion FileName

// #region Stream
export type {
  StreamType,
  Encoding,
} from './AutoHotkeyDebugger';
// #endregion Stream

// #region Status
export type {
  RunState,
  StatusReason,
} from './AutoHotkeyDebugger';
// #endregion Status

// #region Command
export type {
  CommandName,
  BreakpointCommandName,
  StackCommandName,
  ContextCommandName,
  PropertyCommandName,
  ExtendedCommandName,
  RequireContinuationCommandName,
  OptionalContinuationCommandName,
  ContinuationCommandName,
} from './AutoHotkeyDebugger';
// #endregion Command

// #region Feature
export type {
  AppId,
  ProtocolVersion,
  LanguageName,
  DebuggerParent,
  FeatureName,
  Features,
} from './AutoHotkeyDebugger';
// #endregion Feature

// #region Breakpoint
export type BreakpointType = 'line' | 'call' | 'return' | 'exception' | 'conditional';
export type { BreakpointState } from './AutoHotkeyDebugger';
export type {
  Condition,
  ExpressionCondition,
  HitConditionOperator,
  HitCondition,
} from './dbgp';
export type Breakpoint
  = dbgp.LineBreakpoint
  | dbgp.FunctionBreakpoint
  | dbgp.ReturnBreakpoint
  | dbgp.ExceptionBreakpoint
  | dbgp.ConditionalBreakpoint;
export type {
  LineBreakpoint,
  FunctionBreakpoint,
  ReturnBreakpoint,
  ExceptionBreakpoint,
  ConditionalBreakpoint,
} from './dbgp';
// #endregion Breakpoint

// #region Stack
export type {
  StackType,
  LineNumber,
  CharacterNumber,
  CmdRange,
  Stack,
} from './AutoHotkeyDebugger';
// #endregion Stack

// #region Context
export type {
  ContextNames,
  Context,
} from './AutoHotkeyDebugger';
// #endregion Context

// #region TypeMap
export type {
  DataTypeName,
  DataType,
  TypeMap,
} from './dbgp';
// #endregion TypeMap

// #region Property
export type {
  UndefinedType,
  PropertyFacet,
  Property,
  PrimitiveProperty,
  ObjectProperty,
} from './AutoHotkeyDebugger';
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
} from './AutoHotkeyDebugger';
// #endregion Error

// #region Version
export type {
  DecimalNumber,
  FloatNumber,
  MejorVersion,
  MinorVersion,
  PatchVersion,
  PreReleaseVersion,
  PreReleaseId,
  AutoHotkeyVersion,
  ParsedAutoHotkeyVersion,
  ParseAutoHotkeyVersion,
  AutoHotkeyVersionCompare,
} from './AutoHotkeyDebugger';
// #endregion Version
// #endregion data

// #region Packet
export type {
  PacketName,
  Packet,
  InitPacket,
  StreamPacket,
  ResponcePacket,
} from './AutoHotkeyDebugger';
// #endregion Packet

// #region Responce
export type {
  InitResponce,
  StreamResponce,
  StatusResponse,
} from './AutoHotkeyDebugger';

export type CommandResponce = '';
export type {
  FeatureGetResponse,
  FeatureSetResponse,
} from './AutoHotkeyDebugger';

export interface ContinuationResponse extends ahkdbg.StatusResponse {
  command: ahkdbg.ContinuationCommandName;
  breakpoint?: Breakpoint;
}
export interface BreakpointGetResponce extends dbgp.CommandResponseBase {
  command: 'breakpoint_get';
  breakpoint: Breakpoint;
}

export type {
  BreakpointSetResponce,
  BreakpointUpdateResponce,
  BreakpointRemoveResponce,
} from './AutoHotkeyDebugger';

export interface BreakpointListResponce extends dbgp.CommandResponseBase {
  command: 'breakpoint_list';
  breakpoints: Breakpoint[];
}

export type {
  StackDepthResponce,
  StackGetResponce,
  ContextNamesResponce,
  ContextGetResponce,
  PropertySetResponse,
  PropertyGetResponse,
  PropertyValueResponse,
  SourceResponce,
  StdOutResponce,
  StdErrResponce,
  BreakResponce,
} from './AutoHotkeyDebugger';
// #endregion Responce

// #region client
// #region client
export type CommandSession = RequireCommandSession | ExtendedCommandSession;
export interface RequireCommandSession {
  sendStatusCommand: () => Promise<ahkdbg.StatusResponse>;                                                                                                      // $ status -i TRANSACTION_ID
  sendFeatureGetCommand: (featureName: ahkdbg.FeatureName) => Promise<ahkdbg.FeatureSetResponse>;                                                               // $ feature_get -i TRANSACTION_ID -n FEATURE_NAME
  sendFeatureSetCommand: (featureName: ahkdbg.FeatureName, value: string) => Promise<ahkdbg.FeatureSetResponse>;                                                // $ feature_set -i TRANSACTION_ID -n FEATURE_NAME -v VALUE
  sendRunCommand: () => Promise<ahkdbg.ContinuationResponse>;                                                                                                   // $ run -i TRANSACTION_ID
  sendStepIntoCommand: () => Promise<ahkdbg.ContinuationResponse>;                                                                                              // $ step_into -i TRANSACTION_ID
  sendStepOverCommand: () => Promise<ahkdbg.ContinuationResponse>;                                                                                              // $ step_over -i transaction_id
  sendStepOutCommand: () => Promise<ahkdbg.ContinuationResponse>;                                                                                               // $ step_out -i TRANSACTION_ID
  sendStopCommand: () => Promise<ahkdbg.ContinuationResponse>;                                                                                                  // $ stop -i TRANSACTION_ID
  sendDetachCommand: () => Promise<ahkdbg.ContinuationResponse>;                                                                                                // $ detach -i TRANSACTION_ID
  sendBreakpointGetCommand: () => Promise<ahkdbg.BreakpointGetResponce>;                                                                                        // $ breakpoint_get -i TRANSACTION_ID -d BREAKPOINT_ID
  sendBreakpointSetCommand: (fileName: ahkdbg.FileName, line: ahkdbg.LineNumber, condition?: dbgp.Condition) => Promise<ahkdbg.BreakpointSetResponce>;          // $ breakpoint_set -i TRANSACTION_ID -t "line" -s STATE -f FILE_NAME -n LINE_NUMBER
  sendConditionalBreakpointSetCommand: (fileName: ahkdbg.FileName, line: ahkdbg.LineNumber, condition: dbgp.Condition) => Promise<dbgp.BreakpointSetResponce>;  // $ breakpoint_set -i TRANSACTION_ID -t "conditional" -s STATE -f FILE_NAME -n LINE_NUMBER [-h HIT_VALUE -o HIT_CONDITION -- base64(EXPRESSION)]
  sendCallBreakpointSetCommand: (functionName: string, hitCondition?: dbgp.HitCondition) => Promise<ahkdbg.BreakpointSetResponce>;                              // $ breakpoint_set -i TRANSACTION_ID -t "call" -s STATE -m FUNCTION_NAME [ -h HIT_VALUE -o HIT_CONDITION ]
  sendFunctionBreakpointSetCommand: RequireCommandSession['sendCallBreakpointSetCommand'];                                                                      //
  sendReturnBreakpointSetCommand: (functionName: string) => Promise<ahkdbg.BreakpointSetResponce>;                                                              // $ breakpoint_set -i TRANSACTION_ID -t "return" -s STATE -m FUNCTION_NAME [ -h HIT_VALUE -o HIT_CONDITION ]
  sendExceptionBreakpointSetCommand: (exception: string) => Promise<ahkdbg.BreakpointSetResponce>;                                                              // $ breakpoint_set -i TRANSACTION_ID -t "exception" -s STATE -x EXCEPTION_NAME [ -h HIT_VALUE -o HIT_CONDITION ]
  sendBreakpointUpdateCommand: (breakpointId: ahkdbg.BreakpointId) => Promise<ahkdbg.BreakpointUpdateResponce>;                                                 // $ breakpoint_update -i TRANSACTION_ID -d BREAKPOINT_ID [ -s STATE -n LINE_NUMBER -h HIT_VALUE -o HIT_CONDITION ]
  sendBreakpointRemoveCommand: (breakpointId: ahkdbg.BreakpointId) => Promise<ahkdbg.BreakpointRemoveResponce>;                                                 // $ breakpoint_remove -i TRANSACTION_ID -d BREAKPOINT_ID
  sendBreakpointListCommand: () => Promise<ahkdbg.BreakpointListResponce>;                                                                                      // $ breakpoint_list -i TRANSACTION_ID
  sendStackDepthCommand: () => Promise<ahkdbg.StackDepthResponce>;                                                                                              // $ stack_depth -i TRANSACTION_ID
  sendStackGetCommand: (stackDepth?: number) => Promise<ahkdbg.StackGetResponce>;                                                                               // $ stack_get -i TRANSACTION_ID [ -d STACK_DEPTH ]
  sendContextNamesCommand: (stackDepth?: number) => Promise<ahkdbg.ContextNamesResponce>;                                                                       // $ context_names -i TRANSACTION_ID [ -d STACK_DEPTH ]
  sendContextGetCommand: (contextId?: ahkdbg.ContextId, depth?: number) => Promise<ahkdbg.ContextGetResponce>;                                                  // $ context_get -i TRANSACTION_ID [ -d STACK_DEPTH -c CONTEXT_NUMBER ]
  sendTypeMapGetCommand: () => Promise<ahkdbg.TypeMapGetResponce>;                                                                                              // $ typemap_get -i TRANSACTION_ID
  sendPropertyGetCommand: (propertyLongName: string, depth?: number) => Promise<ahkdbg.PropertyGetResponse>;                                                    // $ property_get -i TRANSACTION_ID -n PROPERTY_LONG_NAME [ -d STACK_DEPTH ]
  sendPropertySetCommand: (propertyLongName: string, depth?: number) => Promise<ahkdbg.PropertySetResponse>;                                                    // $ property_set -i TRANSACTION_ID -n PROPERTY_LONG_NAME -l DATA_LENGTH [ -d STACK_DEPTH ] -- DATA
  sendPropertyValueCommand: (propertyLongName: string, depth?: number) => Promise<ahkdbg.PropertyValueResponse>;                                                // $ property_value -i TRANSACTION_ID -n PROPERTY_LONG_NAME [ -d STACK_DEPTH ]
  sendSourceCommand: (fileName: ahkdbg.FileName) => Promise<ahkdbg.SourceResponce>;                                                                             // $ source -i TRANSACTION_ID -f FILEURI
  sendStdOutCommand: (outputControl: ahkdbg.OutputControl) => Promise<ahkdbg.StdOutResponce>;                                                                   // $ stdout -i transaction_id -c OUTPUT_CONTROL
  sendStdErrCommand: (outputControl: ahkdbg.OutputControl) => Promise<ahkdbg.StdOutResponce>;                                                                   // $ stderr -i transaction_id -c OUTPUT_CONTROL
}
export interface ExtendedCommandSession {
  sendBreakCommand: () => Promise<ahkdbg.BreakResponce>;                                                                                                        // $ break -i TRANSACTION_ID
}
// #endregion client
