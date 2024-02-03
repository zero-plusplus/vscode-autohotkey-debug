import * as net from 'net';
import { timeoutPromise } from '../promise';

// #region helpers
const tryConnect = async(socket: net.Socket, port: number, hostname: string): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    socket.once('connect', () => {
      resolve(true);
    });
    socket.once('error', (err) => {
      switch ('code' in err && err.code) {
        case 'EACCES':
        case 'ECONNRESET':
        case 'ETIMEDOUT':
        case 'EADDRINUSE': {
          resolve(true);
          return;
        }
        case 'ENOTFOUND':
        case 'ECONNREFUSED': {
          resolve(false);
          return;
        }
        default: break;
      }

      resolve(true);
    });
    socket.connect(port, hostname);
  });
};
const socketCleanUp = async(socket: net.Socket): Promise<void> => {
  return new Promise((resolve) => {
    socket.end(() => {
      socket.destroy();
      resolve();
    });
  });
};
const useSocket = async<R>(callback: (socket: net.Socket) => Promise<R>): Promise<R> => {
  const socket = new net.Socket();
  try {
    const result = await callback(socket);
    return result;
  }
  finally {
    await socketCleanUp(socket);
  }
};
// #endregion helpers

interface CheckPortUsed {
  (port: number, timeout_ms?: number): Promise<boolean>;
  (port: number, hostname?: string, timeout_ms?: number): Promise<boolean>;
}
const defaultHostName = 'localhost';
const defaultTimeout_ms = 1000;
export const checkPortUsed: CheckPortUsed = async(...args): Promise<boolean> => {
  const isArgsBy_port_timeout_ms = args.length === 2;

  const port = args.at(0) as number;
  const hostname = (isArgsBy_port_timeout_ms ? defaultHostName : (args.at(1) ?? defaultHostName)) as string;
  const timeout_ms = (isArgsBy_port_timeout_ms ? args.at(1) : (args.at(2) ?? defaultTimeout_ms)) as number;

  return timeoutPromise(
    useSocket(async(socket) => {
      return tryConnect(socket, port, hostname);
    }),
    timeout_ms,
  );
};
