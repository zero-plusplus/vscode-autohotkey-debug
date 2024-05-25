import { EventEmitter } from 'events';
import { AutoHotkeyProcess } from '../types/dbgp/session.types';
import { Server, Socket } from 'net';
import { EventManager } from '../types/dbgp/event.types';

export const createEventManager = (): EventManager => {
  const eventEmitter = new EventEmitter();
  let process: AutoHotkeyProcess | undefined;
  let isServerTerminated = true;

  const eventManager: EventManager = {
    get isRuntimeTerminated(): boolean {
      return (process?.isTerminated ?? false);
    },
    get isServerTerminated(): boolean {
      return isServerTerminated;
    },
    registerProcessEvent: (process: AutoHotkeyProcess): void => {
      process.on('close', (exitCode?: number) => {
        if (process.isTerminated) {
          return;
        }

        process.isTerminated = true;
        eventManager.emit('process:close', exitCode);
      });
      process.on('error', (exitCode?: number) => {
        if (process.isTerminated) {
          return;
        }

        process.isTerminated = true;
        eventManager.emit('process:error', exitCode);
      });
      process.stdout.on('data', (data) => {
        if (data !== undefined) {
          eventManager.emit('process:stdout', String(data));
        }
        eventEmitter.emit('process:stdout', data === undefined ? undefined : String(data));
      });
      process.stderr.on('data', (data?) => {
        eventEmitter.emit('process:stderr', data === undefined ? undefined : String(data));
      });
    },
    registerSocketEvent: (socket: Socket): void => {
      // #region socket events
      socket.on('close', () => {
        if (isServerTerminated) {
          return;
        }

        isServerTerminated = true;
        eventEmitter.emit('debugger:close', 'debugger');
      });
      socket.on('error', (err?: Error) => {
        if (isServerTerminated) {
          return;
        }

        isServerTerminated = true;
        eventEmitter.emit('debugger:error', 'debugger', err);
      });
      socket.on('disconnect', () => {
        if (isServerTerminated) {
          return;
        }

        isServerTerminated = true;
        eventEmitter.emit('debugger:close', 'debugger');
      });
      socket.on('exit', () => {
        if (isServerTerminated) {
          return;
        }

        isServerTerminated = true;
        eventEmitter.emit('debugger:close', 'debugger');
      });
    },
    registerServerEvent: (server: Server): void => {
      server.on('close', () => {
        if (isServerTerminated) {
          return;
        }

        isServerTerminated = true;
        eventEmitter.emit('server:close', 'debugger');
      });
      server.on('error', () => {
        if (isServerTerminated) {
          return;
        }

        isServerTerminated = true;
        eventEmitter.emit('server:error', 'debugger');
      });
      server.on('disconnect', () => {
        if (isServerTerminated) {
          return;
        }

        isServerTerminated = true;
        eventEmitter.emit('server:close', 'debugger');
      });
      server.on('exit', () => {
        if (isServerTerminated) {
          return;
        }
        isServerTerminated = true;
        eventEmitter.emit('server:close', 'debugger');
      });
    },
    emit: (eventName: string, ...args: any[]): void => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      eventEmitter.emit(eventName, ...args);
    },
    on: (eventName: string, listener: (...args: any[]) => void): void => {
      eventEmitter.on(eventName, listener);
    },
    once: (eventName: string, listener: (...args: any[]) => void): void => {
      eventEmitter.on(eventName, listener);
    },
  };
  return eventManager;
};
