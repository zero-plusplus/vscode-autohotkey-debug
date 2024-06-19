import { Server, Socket } from 'net';
import { Time } from '../tools/time.types';
import * as dbgp from './AutoHotkeyDebugger.types';
import { ChildProcessWithoutNullStreams } from 'child_process';
import { ParsedAutoHotkeyVersion } from '../tools/autohotkey/version/common.types';

export interface AutoHotkeyProcess extends ChildProcessWithoutNullStreams {
  program: string;
  isTerminated: boolean;
  invocationCommand: string;
}
export interface SessionConnector {
  connect: (port: number, hostname: string, process?: AutoHotkeyProcess) => Promise<Session>;
}
export interface DebugServer {
  baseServer: Server;
  socket: Socket;
  communicator: SessionCommunicator;
  process?: AutoHotkeyProcess;
  isTerminated: boolean;
  listen: (port: number, hostname: string) => Promise<Session>;
  close: (timeout_ms?: number) => Promise<void>;
  detach: (timeout_ms?: number) => Promise<void>;
}
export type PacketHandler = (packet: Buffer) => void;
export type EventSource = 'debugger' | 'process';
export type MessageListener = (source: EventSource, message: string) => void;
export type CloseListener = (source: EventSource, exitCode?: number) => void;
export type ErrorListener = (source: EventSource, err?: Error) => void;
export interface SessionCommunicator {
  initPacket: dbgp.InitPacket;
  server: DebugServer;
  process?: AutoHotkeyProcess;
  rawSendCommand: <T extends dbgp.CommandResponse = dbgp.CommandResponse>(command: string) => Promise<T>;
  sendCommand: CommandSender;
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
export type BreakpointSetRequest =
  | LineBreakpointSetRequest
  | ExceptionBreakpointSetRequest;

export interface BreakpointSetRequestBase {
  type?: dbgp.BreakpointType;
  state?: dbgp.BreakpointState;
}
export interface LineBreakpointSetRequest extends BreakpointSetRequestBase {
  type?: 'line';
  fileName: string;
  line: number;
}
export interface ExceptionBreakpointSetRequest extends BreakpointSetRequestBase {
  type: 'exception';
  exceptionName?: string;
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
  stackLevel: 0;
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
  numberOfChildren: number | undefined;
  address: number;
  children?: Property[];
}
export type PseudoProperty = PseudoPrimitiveProperty;
export interface PseudoPrimitiveProperty extends PseudoPropertyBase {
  type: dbgp.PrimitiveDataType;
  constant: undefined;
  value: string;
}

export type CommandArg = string | number | boolean;
export type CommandSender = <T extends dbgp.CommandResponse = dbgp.CommandResponse>(command: dbgp.CommandName, args?: Array<CommandArg | undefined>, data?: string) => Promise<T>;
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
  ahkVersion: ParsedAutoHotkeyVersion;
  // #region dbgp commands
  // [7.1 status](https://xdebug.org/docs/dbgp#status)
  sendStatusCommand: () => Promise<dbgp.StatusResponse>;

  // [7.2.2 feature_get](https://xdebug.org/docs/dbgp#feature-get)
  sendFeatureGetCommand: (featureName: dbgp.FeatureName) => Promise<dbgp.FeatureGetResponse>;
  // [7.2.3 feature_set](https://xdebug.org/docs/dbgp#feature-set)
  sendFeatureSetCommand: (featureName: dbgp.FeatureName, value: CommandArg) => Promise<dbgp.FeatureSetResponse>;

  // [7.5 continuation commands](https://xdebug.org/docs/dbgp#continuation-commands)
  sendContinuationCommand: (command: dbgp.ContinuationCommandName) => Promise<dbgp.ContinuationResponse>;

  // [7.6.1 breakpoint_set](https://xdebug.org/docs/dbgp#id3)
  sendBreakpointSetCommand: (request: BreakpointSetRequest) => Promise<dbgp.BreakpointSetResponse>;
  // [7.6.2 breakpoint_get](https://xdebug.org/docs/dbgp#id4)
  sendBreakpointGetCommand: (breakpointId: number) => Promise<dbgp.BreakpointGetResponse>;
  // [7.6.4 breakpoint_remove](https://xdebug.org/docs/dbgp#id6)
  sendBreakpointRemoveCommand: (breakpointId: number) => Promise<dbgp.BreakpointRemoveResponse>;

  // [7.8 stack_get](https://xdebug.org/docs/dbgp#stack-get)
  sendStackGetCommand: () => Promise<dbgp.StackGetResponse>;

  // [7.9 context_names](https://xdebug.org/docs/dbgp#context-names)
  sendContextNamesCommand: () => Promise<dbgp.ContextNamesResponse>;
  // [7.10 context_get](https://xdebug.org/docs/dbgp#context-get)
  sendContextGetCommand: (contextIdOrName: dbgp.ContextId | dbgp.ContextName, stackLevel?: number, maxDepth?: number, maxChildren?: number) => Promise<dbgp.ContextGetResponse>;

  // [7.13 property_get](https://xdebug.org/docs/dbgp#property-get-property-set-property-value)
  sendPropertyGetCommand: (name: string, contextIdOrName?: dbgp.ContextId | dbgp.ContextName, stackLevel?: number, maxDepth?: number, maxChildren?: number, page?: number) => Promise<dbgp.PropertyGetResponse>;
  // [7.13 property_set](https://xdebug.org/docs/dbgp#property-get-property-set-property-value)
  sendPropertySetCommand: (name: string, value: string | number | boolean, type?: dbgp.DataType, contextIdOrName?: dbgp.ContextId | dbgp.ContextName, stackLevel?: number) => Promise<dbgp.PropertySetResponse>;

  // [8.2 break](https://xdebug.org/docs/dbgp#break)
  sendBreakCommand: () => Promise<dbgp.BreakResponse>;
}

