import * as fs from 'fs';
import * as net from 'net';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import * as dbgp from '../../src/dbgpSession';
import { ExpressionEvaluator } from '../../src/util/evaluator/ExpressionEvaluator';
import { toFileUri } from '../../src/util/util';

const debugAutoHotkey = (file: string, runtime?: string, port = 9000, hostname = 'localhost'): ChildProcess => {
  let _runtime = runtime ?? `${String(process.env.PROGRAMFILES)}/AutoHotkey/AutoHotkey.exe`;
  if (!path.isAbsolute(_runtime)) {
    _runtime = path.join(`${String(process.env.PROGRAMFILES)}/AutoHotkey`, _runtime);
  }
  return spawn(_runtime, [ `/Debug=${hostname}:${port}`, file ]);
};

const sampleDir = path.resolve(__dirname, 'ahk');
const port = 9003;
const hostname = '127.0.0.1';
describe('ExpressionEvaluator for v1', (): void => {
  let process: ChildProcess;
  let server: net.Server;
  let session: dbgp.Session;
  let evaluator: ExpressionEvaluator;

  beforeAll(async() => {
    return new Promise<void>((resolve) => {
      const runtime = 'AutoHotkey.exe';
      const program = path.resolve(sampleDir, '1.ahk');
      process = debugAutoHotkey(program, runtime, port, hostname);
      server = net.createServer()
        .listen(port, hostname)
        .on('connection', (socket) => {
          session = new dbgp.Session(socket)
            .on('init', (initPacket: dbgp.InitPacket) => {
              // eslint-disable-next-line no-sync
              const source = fs.readFileSync(program, 'utf-8');
              const lines = source.split('\r\n').length;
              session.sendBreakpointSetCommand(toFileUri(program), lines);
              session.sendRunCommand();
              evaluator = new ExpressionEvaluator(session);
              resolve();
            });
        });
    });
  });
  afterAll(() => {
    process.kill();
    server.close();
    session.close();
  });

  test('eval', async(): Promise<void> => {
    expect(await evaluator.eval('10 * 3 + (num - 123) - 30')).toBe(0);
    expect(await evaluator.eval('10 * (3 + (num - 123) - 30)')).toBe(-270);
    expect(await evaluator.eval('obj.key')).toBe('value');
    expect(await evaluator.eval('obj["key"]')).toBe('value');
    expect(await evaluator.eval('arr[3]')).toBe(100);
    expect(await evaluator.eval('nestedObj.a.b.arr[3]')).toBe(100);
    expect(await evaluator.eval('nestedObj.a.b.arr[3]')).toBe(100);
  });
});
