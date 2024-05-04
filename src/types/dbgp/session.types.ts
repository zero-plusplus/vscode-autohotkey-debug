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

export const contextIdByName: Record<dbgp.ContextName, dbgp.ContextId> = {
  'Local': 0,
  'Global': 1,
  'Static': 2,
};
export const contextNameById: Record<number, dbgp.ContextName> = {
  '0': 'Local',
  '1': 'Global',
  '2': 'Static',
};
export type Property = PrimitiveProperty | ObjectProperty;
export interface PropertyBase {
  contextId: dbgp.ContextId;
  stackLevel?: number;
  name: string;
  fullName: string;
  size: number;
  type: dbgp.DataType;
}
export interface PseudoPropertyBase {
  contextId: -1;
  stackLevel: undefined;
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
export type PseudoProperty = PseudoPrimitiveProperty;
export interface PseudoPrimitiveProperty extends PseudoPropertyBase {
  type: dbgp.PrimitiveDataType;
  constant: undefined;
  value: string;
}
export interface Context {
  id: dbgp.ContextId;
  name: dbgp.ContextName;
  properties: Property[];
}

export type CommandArg = string | number | boolean;
export type CommandSender = <T extends dbgp.CommandResponse = dbgp.CommandResponse>(command: dbgp.CommandName, args?: Array<CommandArg | undefined>, data?: CommandArg) => Promise<T>;
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
  getMaxChildren: () => Promise<number>;
  getMaxDepth: () => Promise<number>;
  setMaxChildren: (value: string | number | boolean) => Promise<boolean>;
  setMaxDepth: (value: string | number | boolean) => Promise<boolean>;
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
  getContext: (contextIdOrName: dbgp.ContextId | dbgp.ContextName, stackLevel?: number) => Promise<Context>;
  getContexts: (stackLevel?: number) => Promise<Context[]>;
  getProperty: (name: string, contextIdOrName?: dbgp.ContextId | dbgp.ContextName, stackLevel?: number, maxDepth?: number) => Promise<Property>;
  setProperty: (name: string, value: string | number | boolean, type?: dbgp.DataType, contextIdOrName?: dbgp.ContextId | dbgp.ContextName, stackLevel?: number) => Promise<Property>;
  // #endregion execuation context
  // #region breakpoint
  setExceptionBreakpoint: (enabled: boolean) => Promise<ExceptionBreakpoint>;
  getBreakpointById: <T extends Breakpoint = Breakpoint>(id: number) => Promise<T>;
  setLineBreakpoint: (fileName: string, line: number) => Promise<LineBreakpoint>;
  removeBreakpointById: (id: number) => Promise<void>;
  // #endregion breakpoint

}

