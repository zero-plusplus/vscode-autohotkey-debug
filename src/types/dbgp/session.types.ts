import { ParsedAutoHotkeyVersion } from '../tools/autohotkey/version/common.types';
import { Time } from '../tools/time.types';
import * as dbgp from './AutoHotkeyDebugger.types';
import { ChildProcessWithoutNullStreams } from 'child_process';

export interface AutoHotkeyProcess extends ChildProcessWithoutNullStreams {
  program: string;
  isTerminated: boolean;
  invocationCommand: string;
}
export interface SessionConnector {
  connect: (port: number, hostname: string, process?: AutoHotkeyProcess) => Promise<Session>;
}
export type EventSource = 'debugger' | 'process';
export type MessageListener = (source: EventSource, message: string) => void;
export type CloseListener = (source: EventSource, exitCode?: number) => void;
export type ErrorListener = (source: EventSource, err?: Error) => void;
export interface SessionCommunicator {
  initPacket: dbgp.InitPacket;
  isTerminated: boolean;
  process?: AutoHotkeyProcess;
  sendCommand: CommandSender;
  close: (timeout_ms: number) => Promise<void>;
  detach: (timeout_ms: number) => Promise<void>;
  onStdOut: (listener: MessageListener) => void;
  onStdErr: (listener: MessageListener) => void;
  onWarning: (listener: MessageListener) => void;
  onOutputDebug: (listener: MessageListener) => void;
  onClose: (listener: CloseListener) => void;
  onError: (listener: ErrorListener) => void;
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
  contextId: dbgp.ContextId | -1;
  depth?: number;
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
  id: dbgp.ContextId | -1;
  name: ContextName | 'None';
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

export interface PendingCommand {
  request: string;
  resolve: (...args) => any;
}
export interface Session extends SessionCommunicator {
  initPacket: dbgp.InitPacket;
  version: ParsedAutoHotkeyVersion;
  sendCommand: CommandSender;
  // #region setting
  suppressException: () => Promise<boolean>;
  // #endregion setting
  // #region execuation
  exec: (commandName: dbgp.ContinuationCommandName) => Promise<ExecResult>;
  break: () => Promise<ScriptStatus>;
  close: () => Promise<void>;
  detach: () => Promise<void>;
  // #endregion execuation
  // #region execuation context
  getScriptStatus: () => Promise<ScriptStatus>;
  getCallStack: () => Promise<CallStack>;
  getContext: (contextId: number, depth?: number) => Promise<Context>;
  getContexts: (depth?: number) => Promise<Context[]>;
  getProperty: (contextId: number, name: string, depth?: number) => Promise<Property>;
  setProperty: (matcher: { contextId: number; name: string; value: string | number | boolean; type?: dbgp.DataType; depth?: number }) => Promise<Property>;
  // #endregion execuation context
  // #region breakpoint
  setExceptionBreakpoint: (enabled: boolean) => Promise<ExceptionBreakpoint>;
  getBreakpointById: <T extends Breakpoint = Breakpoint>(id: number) => Promise<T>;
  setLineBreakpoint: (fileName: string, line: number) => Promise<LineBreakpoint>;
  removeBreakpointById: (id: number) => Promise<void>;
  // #endregion breakpoint

}

