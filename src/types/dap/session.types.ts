import * as dbgp from '../dbgp/AutoHotkeyDebugger.types';
import { ChildProcessWithoutNullStreams } from 'child_process';

export interface Process extends ChildProcessWithoutNullStreams {
  invocationCommand: string;
}
export interface SessionConnector {
  connect: (port: number, hostname: string, process?: Process) => Promise<Session>;
}
export interface Breakpoint {
  id: number;
  type: dbgp.BreakpointType;
  fileName: string;
  line: number;
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
  setLineBreakpoint: (fileName: string, line: number) => Promise<Breakpoint>;
  close: () => Promise<Error | undefined>;
  detach: () => Promise<Error | undefined>;
}

