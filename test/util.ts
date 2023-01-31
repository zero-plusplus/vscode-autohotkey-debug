import * as fs from 'fs';
import * as net from 'net';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as dbgp from '../src/dbgpSession';
import { getUnusedPort, timeoutPromise, toFileUri } from '../src/util/util';

export const runAutoHotkeyWithDebug = (file: string, runtime?: string, port = 9000, hostname = 'localhost'): ChildProcess => {
  let _runtime = runtime ?? `${String(process.env.PROGRAMFILES)}/AutoHotkey/AutoHotkey.exe`;
  if (!path.isAbsolute(_runtime)) {
    _runtime = path.join(`${String(process.env.PROGRAMFILES)}/AutoHotkey`, _runtime);
  }
  return spawn(_runtime, [ `/Debug=${hostname}:${port}`, '/force', '/restart', file ]);
};
export const launchDebug = async(runtime: string, program: string, port: number, hostname: string): Promise<{ session: dbgp.Session; process: ChildProcess; server: net.Server }> => {
  return new Promise((resolve) => {
    const process = runAutoHotkeyWithDebug(program, runtime, port, hostname);
    const server = net.createServer()
      .listen(port, hostname)
      .on('connection', (socket) => {
        const session = new dbgp.Session(socket)
          .on('init', (initPacket: dbgp.InitPacket) => {
            // eslint-disable-next-line no-sync
            const source = fs.readFileSync(program, 'utf-8');
            const lines = source.split('\r\n').length;
            session.sendBreakpointSetCommand(toFileUri(program), lines);
            session.sendRunCommand();
            resolve({ session, process, server });
          });
      });
  });
};
export const closeSession = async(session: dbgp.Session, process: ChildProcess): Promise<void> => {
  if (session.socketWritable) {
    await timeoutPromise(session.sendStopCommand(), 500).catch(() => {
      process.kill();
    });
  }
  await session.close();
};
export const getPort = async(hostname = '127.0.0.1', start?: number, end?: number): Promise<number> => {
  if (typeof start !== 'undefined' && typeof end === 'undefined') {
    return getUnusedPort(hostname, start, start);
  }
  if (typeof start !== 'undefined' && typeof end !== 'undefined') {
    return getUnusedPort(hostname, start, end);
  }
  return getUnusedPort(hostname, 49152, 65535);
};
