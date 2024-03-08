import * as dbgp from './AutoHotkeyDebugger.types';
import { ChildProcessWithoutNullStreams } from 'child_process';

export interface Process extends ChildProcessWithoutNullStreams {
  invocationCommand: string;
}
export interface SessionConnector {
  connect: (port: number, hostname: string, process?: Process) => Promise<Session>;
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
  on: (eventName: SessionEventName, litener: (...args: any[]) => void) => this;
  once: (eventName: SessionEventName, litener: (...args: any[]) => void) => this;
  off: (eventName: SessionEventName, litener: (...args: any[]) => void) => this;
  sendCommand: CommandSender;
  getBreakpointById: <T extends Breakpoint = Breakpoint>(id: number) => Promise<T>;
  setLineBreakpoint: (fileName: string, line: number) => Promise<LineBreakpoint>;
  setExceptionBreakpoint: (enabled: boolean) => Promise<ExceptionBreakpoint>;
  close: () => Promise<Error | undefined>;
  detach: () => Promise<Error | undefined>;
}

