import { ParsedAutoHotkeyVersion } from '../tools/autohotkey/version/common.types';
import { Time } from '../tools/time.types';
import * as dbgp from './AutoHotkeyDebugger.types';
import { ChildProcessWithoutNullStreams } from 'child_process';

export interface AutoHotkeyProcess extends ChildProcessWithoutNullStreams {
  program: string;
  invocationCommand: string;
}
export interface SessionConnector {
  connect: (port: number, hostname: string, process?: AutoHotkeyProcess) => Promise<Session>;
}
export interface ScriptStatus {
  runState: dbgp.RunState;
  reason: dbgp.StatusReason;
}
export interface ExecResult extends ScriptStatus {
  command: dbgp.ContinuationCommandName;
  elapsedTime: Time;
}
export type CallStack = StackFrame[];
export interface StackFrame {
  type: dbgp.StackType;
  fileName: string;
  line: number;
  level: number;
  where: string;
}
export type Breakpoint =
  | LineBreakpoint
  | ExceptionBreakpoint;
export interface LineBreakpoint {
  id: number;
  type: dbgp.BreakpointType;
  fileName: string;
  line: number;
  state: dbgp.BreakpointState;
}
export interface ExceptionBreakpoint {
  type: 'exception';
  state: dbgp.BreakpointState;
}

export type ContextName = dbgp.ContextName;
export const contextIdByName: Record<ContextName, number> = {
  'Local': dbgp.ContextId.Local,
  'Global': dbgp.ContextId.Global,
  'Static': dbgp.ContextId.Static,
};
export const contextNameById: Record<number, ContextName> = {
  [dbgp.ContextId.Local]: 'Local',
  [dbgp.ContextId.Global]: 'Global',
  [dbgp.ContextId.Static]: 'Static',
};
export type Property = UnsetProperty | PrimitiveProperty | ObjectProperty;
export interface PropertyBase {
  name: string;
  fullName: string;
  size: number;
  type: dbgp.DataType;
}
export interface UnsetProperty extends PropertyBase {
  type: dbgp.UnsetDataType;
  value: '';
}
export interface PrimitiveProperty extends PropertyBase {
  type: dbgp.PrimitiveDataType;
  constant: boolean;
  value: string;
}
export interface ObjectProperty extends PropertyBase {
  type: dbgp.ObjectDataType;
  className: string;
  facet: dbgp.PropertyFacet;
  hasChildren: boolean;
  address: number;
  children: Property[];
}
export interface Context {
  id: dbgp.ContextId;
  name: ContextName;
  properties: Property[];
}

export type CommandSender = <T extends dbgp.CommandResponse = dbgp.CommandResponse>(command: dbgp.CommandName, args?: Array<string | number | boolean | undefined>, data?: string) => Promise<T>;
export type SessionEventName =
| 'process:close'
| 'process:error'
| 'process:stdout'
| 'process:stderr'
| 'debugger:close'
| 'debugger:error'
| 'debugger:init'
| 'debugger:stdout'
| 'debugger:stderr'
| 'server:close'
| 'server:error';

export interface Session {
  initPacket: dbgp.InitPacket;
  version: ParsedAutoHotkeyVersion;
  isTerminatedProcess: boolean;
  sendCommand: CommandSender;
  // #region setting
  suppressException: () => Promise<boolean>;
  setLanguageVersion: () => Promise<ParsedAutoHotkeyVersion>;
  // #endregion setting
  // #region execuation
  exec: (commandName: dbgp.ContinuationCommandName) => Promise<ExecResult>;
  break: () => Promise<ScriptStatus>;
  close: () => Promise<Error | undefined>;
  detach: () => Promise<Error | undefined>;
  // #endregion execuation
  // #region execuation context
  getScriptStatus: () => Promise<ScriptStatus>;
  getCallStack: () => Promise<CallStack>;
  getContext: (contextId: number, depth?: number) => Promise<Context>;
  getContexts: (depth?: number) => Promise<Context[]>;
  getProperty: (contextId: number, name: string, depth?: number) => Promise<Property>;
  // #endregion execuation context
  // #region breakpoint
  setExceptionBreakpoint: (enabled: boolean) => Promise<ExceptionBreakpoint>;
  getBreakpointById: <T extends Breakpoint = Breakpoint>(id: number) => Promise<T>;
  setLineBreakpoint: (fileName: string, line: number) => Promise<LineBreakpoint>;
  removeBreakpointById: (id: number) => Promise<void>;
  // #endregion breakpoint

}

