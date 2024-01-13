/**
 * This file models a virtual debugger that pseudo-extends the features supported by DBGP but not by the AutoHotkey debugger.
 */

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
export type {
  BreakpointState,
  Breakpoint,
  LineBreakpoint,
  FunctionBreakpoint,
  ExceptionBreakpoint,
} from './AutoHotkeyDebugger';

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

// #region Property
export type {
  PropertyFacet,
  PropertyDataType,
  Property,
  PrimitiveProperty,
  ObjectProperty,
} from './AutoHotkeyDebugger';
// #endregion Property

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
  CommandResponce,
  FeatureGetResponse,
  FeatureSetResponse,
  ContinuationResponse,
  BreakpointGetResponce,
  BreakpointSetResponce,
  BreakpointUpdateResponce,
  BreakpointRemoveResponce,
  BreakpointListResponce,
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
