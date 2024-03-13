import { Time } from '../tools/time.types';
import * as dbgp from './AutoHotkeyDebugger.types';
import { ChildProcessWithoutNullStreams } from 'child_process';

export interface Process extends ChildProcessWithoutNullStreams {
  invocationCommand: string;
}
export interface SessionConnector {
  connect: (port: number, hostname: string, process?: Process) => Promise<Session>;
}
export interface ExecResult {
  elapsedTime: Time;
  runState: dbgp.RunState;
  reason: dbgp.StatusReason;
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

export const contextIdByName: Record<dbgp.ContextName, number> = {
  'Local': dbgp.ContextId.Local,
  'Global': dbgp.ContextId.Global,
  'Static': dbgp.ContextId.Static,
};
export type Property = PrimitiveProperty | ObjectProperty;
export interface PropertyBase {
  name: string;
  fullName: string;
  size: number;
  type: dbgp.DataType;
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
  name: dbgp.ContextName;
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
  isTerminatedProcess: boolean;
  on: (eventName: SessionEventName, litener: (...args: any[]) => void) => this;
  once: (eventName: SessionEventName, litener: (...args: any[]) => void) => this;
  off: (eventName: SessionEventName, litener: (...args: any[]) => void) => this;
  sendCommand: CommandSender;
  exec: (commandName: dbgp.RequireContinuationCommandName) => Promise<ExecResult>;
  getCallStack: () => Promise<CallStack>;
  getBreakpointById: <T extends Breakpoint = Breakpoint>(id: number) => Promise<T>;
  setLineBreakpoint: (fileName: string, line: number) => Promise<LineBreakpoint>;
  setExceptionBreakpoint: (enabled: boolean) => Promise<ExceptionBreakpoint>;
  removeBreakpointById: (id: number) => Promise<void>;
  getContext: (contextName: dbgp.ContextName, depth?: number) => Promise<Context>;
  getContexts: (depth?: number) => Promise<Context[]>;
  close: () => Promise<Error | undefined>;
  detach: () => Promise<Error | undefined>;
}

