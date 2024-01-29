import * as dbgp from '../dbgp/ExtendAutoHotkeyDebugger';
import { ChildProcessWithoutNullStreams } from 'child_process';
import EventEmitter from 'events';

export interface Process extends ChildProcessWithoutNullStreams {
  invocationCommand: string;
}
export interface SessionConnector {
  connect: (port: number, hostname: string, process?: Process) => Promise<Session>;
}

export type CommandSender = <R extends dbgp.CommandResponse = dbgp.CommandResponse>(command: dbgp.CommandName, args?: Array<string | number | boolean | undefined>, data?: string) => Promise<R>;
export interface Session {
  responseEmitter: EventEmitter;
  sendCommand: CommandSender;
  close: () => Promise<Error | undefined>;
  detach: () => Promise<Error | undefined>;
}

