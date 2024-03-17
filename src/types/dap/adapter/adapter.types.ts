import EventEmitter from 'events';

export type MessageCategory = 'stdout' | 'stderr' | 'console' | 'important';
export type StopReason =
  | 'entry'
  | 'step'
  | 'breakpoint'
  | 'hidden breakpoint'
  | 'pause'
  | 'exception'
  | 'error'
  | 'exit';

export type Target = 'process' | 'server' | 'debugger';
export type MessageSource = 'stdout' | 'stderr' | 'outputdebug' | 'warning';
export interface RuntimeEventEmitter extends EventEmitter {
  on: ((eventName: 'message' | `${Target}:message`, callback: (source: MessageSource, message?: string) => void) => this)
  & ((eventName: 'error' | `${Target}:error`, callback: (err?: Error) => void) => this)
  & ((eventName: 'close' | `${Target}:close`, callback: (exitCode?: number) => void) => this);
  once: ((eventName: `${Target}:message`, callback: (source: MessageSource, message?: string) => void) => this)
  & ((eventName: `${Target}:error`, callback: (err?: Error) => void) => this)
  & ((eventName: `${Target}:close`, callback: (exitCode?: number) => void) => this);
  off: ((eventName: `${Target}:message`, callback: (source: MessageSource, message?: string) => void) => this)
  & ((eventName: `${Target}:error`, callback: (err?: Error) => void) => this)
  & ((eventName: `${Target}:close`, callback: (exitCode?: number) => void) => this);
  emit: ((eventName: 'message', source: MessageSource, message?: string) => boolean)
  & ((eventName: 'error', err?: Error) => boolean)
  & ((eventName: 'close', exitCode?: number) => boolean);
}
