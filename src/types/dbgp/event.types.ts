import { Server, Socket } from 'net';
import { AutoHotkeyProcess } from './session.types';

export type EventName = ExitEventName | ErrorEventName | MessageEventName;
export type ExitEventName =
  | 'process:error'
  | 'process:close'
  | 'debugger:close';
export type ErrorEventName =
  | 'debugger:error';
export type MessageEventName =
  | 'process:stdout'
  | 'process:stderr'
  | 'debugger:stdout'
  | 'debugger:stderr';
export type MessageEventListener = (message: string) => void;
export type ErrorEventListener = (err?: Error) => void;
export type ExitEventListener = (exitCode?: number) => void;

interface EventRegister {
  (eventName: ExitEventName, listener: ExitEventListener): void;
  (eventName: MessageEventName, listener: MessageEventListener): void;
  (eventName: ErrorEventName, listener: ErrorEventListener): void;
}
interface EmitMethod {
  (eventName: ExitEventName, exitCode?: number): void;
  (eventName: MessageEventName, message: string): void;
  (eventName: ErrorEventName, err?: Error): void;
}
export interface EventManager {
  isRuntimeTerminated: boolean;
  isServerTerminated: boolean;
  registerProcessEvent: (process: AutoHotkeyProcess) => void;
  registerSocketEvent: (socket: Socket) => void;
  registerServerEvent: (server: Server) => void;
  emit: EmitMethod;
  on: EventRegister;
  once: EventRegister;
}
