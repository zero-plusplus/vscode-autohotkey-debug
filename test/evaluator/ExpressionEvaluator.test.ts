import * as fs from 'fs';
import * as net from 'net';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import * as dbgp from '../../src/dbgpSession';
import { ExpressionEvaluator } from '../../src/util/evaluator/ExpressionEvaluator';
import { toFileUri } from '../../src/util/util';

export const debugAutoHotkey = (file: string, runtime?: string, port = 9000, hostname = 'localhost'): ChildProcess => {
  let _runtime = runtime ?? `${String(process.env.PROGRAMFILES)}/AutoHotkey/AutoHotkey.exe`;
  if (!path.isAbsolute(_runtime)) {
    _runtime = path.join(`${String(process.env.PROGRAMFILES)}/AutoHotkey`, _runtime);
  }
  return spawn(_runtime, [ `/Debug=${hostname}:${port}`, file ]);
};
export const launchDebug = async(runtime: string, program: string, port: number, hostname: string): Promise<{ session: dbgp.Session; process: ChildProcess; server: net.Server; evaluator: ExpressionEvaluator }> => {
  return new Promise((resolve) => {
    const process = debugAutoHotkey(program, runtime, port, hostname);
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
            const evaluator = new ExpressionEvaluator(session);
            resolve({ session, process, server, evaluator });
          });
      });
  });
};

const sampleDir = path.resolve(__dirname, 'ahk');
const port = 9003;
const hostname = '127.0.0.1';
describe('ExpressionEvaluator for AutoHotkey-v1', (): void => {
  let process: ChildProcess;
  let server: net.Server;
  let session: dbgp.Session;
  let evaluator: ExpressionEvaluator;

  beforeAll(async() => {
    const data = await launchDebug('AutoHotkey.exe', path.resolve(sampleDir, 'sample.ahk'), port, hostname);
    process = data.process;
    server = data.server;
    session = data.session;
    evaluator = data.evaluator;
  });
  afterAll(async() => {
    process.kill();
    server.close();
    await session.close();
  });

  test('eval', async(): Promise<void> => {
    expect(await evaluator.eval('10 * 3 + (num_int - 123) - 30')).toBe(0);
    expect(await evaluator.eval('10 * (3 + (num_int - 123) - 30)')).toBe(-270);
    expect(await evaluator.eval('obj.key')).toBe('value');
    expect(await evaluator.eval('obj["key"]')).toBe('value');
    expect(await evaluator.eval('obj[key]')).toBe('value');
    expect(await evaluator.eval('arr[3]')).toBe(100);
    expect(await evaluator.eval('nestedObj.a.b.arr[3]')).toBe(100);
    expect(await evaluator.eval('nestedObj.a.b.arr[3]')).toBe(100);
  });

  test('eval libraries', async(): Promise<void> => {
    expect(await evaluator.eval('InstanceOf(instance, T)')).toBe(true);
    expect(await evaluator.eval('CountOf(str_alpha)')).toBe(3);
    expect(await evaluator.eval('CountOf(arr)')).toBe(3);
  });

  test('eval libraries (IsSet)', async(): Promise<void> => {
    for await (const name of [ 'IsSet', 'IsUndefined' ]) {
      expect(await evaluator.eval(`${name}(undefined)`)).toBe(true);
      expect(await evaluator.eval(`${name}(str_alpha)`)).toBe(false);
    }
  });
  test('eval libraries (IsString)', async(): Promise<void> => {
    expect(await evaluator.eval('IsString(str_alpha)')).toBe(true);
    expect(await evaluator.eval('IsString(num_int)')).toBe(false);
    expect(await evaluator.eval('IsString(num_int_like)')).toBe(true);
    expect(await evaluator.eval('IsString(arr)')).toBe(false);
  });
  test('eval libraries (IsNumber)', async(): Promise<void> => {
    expect(await evaluator.eval('IsNumber(num_int)')).toBe(true);
    expect(await evaluator.eval('IsNumber(str_alpha)')).toBe(false);
    expect(await evaluator.eval('IsNumber(arr)')).toBe(false);
  });
  test('eval libraries (IsNumberLike)', async(): Promise<void> => {
    expect(await evaluator.eval('IsNumberLike(str_alpha)')).toBe(false);
    expect(await evaluator.eval('IsNumberLike(num_int)')).toBe(true);
    expect(await evaluator.eval('IsNumberLike(arr)')).toBe(false);
  });
  test('eval libraries (IsInteger)', async(): Promise<void> => {
    expect(await evaluator.eval('IsInteger(num_int)')).toBe(true);
    expect(await evaluator.eval('IsInteger(num_int_like)')).toBe(false);
    expect(await evaluator.eval('IsInteger(str_alpha)')).toBe(false);
    expect(await evaluator.eval('IsInteger(arr)')).toBe(false);
  });
  test('eval libraries (IsIntegerLike)', async(): Promise<void> => {
    expect(await evaluator.eval('IsIntegerLike(num_int)')).toBe(true);
    expect(await evaluator.eval('IsIntegerLike(num_int_like)')).toBe(true);
    expect(await evaluator.eval('IsIntegerLike(num_float)')).toBe(false);
    expect(await evaluator.eval('IsIntegerLike(arr)')).toBe(false);
  });
  test('eval libraries (IsFloat)', async(): Promise<void> => {
    expect(await evaluator.eval('IsFloat(num_float)')).toBe(false);
    expect(await evaluator.eval('IsFloat(num_float_like)')).toBe(false);
    expect(await evaluator.eval('IsFloat(num_int)')).toBe(false);
    expect(await evaluator.eval('IsFloat(num_int_like)')).toBe(false);
    expect(await evaluator.eval('IsFloat(str_alpha)')).toBe(false);
    expect(await evaluator.eval('IsFloat(arr)')).toBe(false);
  });
  test('eval libraries (IsFloatLike)', async(): Promise<void> => {
    expect(await evaluator.eval('IsFloatLike(num_float)')).toBe(true);
    expect(await evaluator.eval('IsFloatLike(num_float_like)')).toBe(true);
    expect(await evaluator.eval('IsFloatLike(num_int)')).toBe(false);
    expect(await evaluator.eval('IsFloatLike(num_int_like)')).toBe(false);
    expect(await evaluator.eval('IsFloatLike(arr)')).toBe(false);
  });
  test('eval libraries (IsHexLike)', async(): Promise<void> => {
    expect(await evaluator.eval('IsHexLike(num_hex_like)')).toBe(true);
    expect(await evaluator.eval('IsHexLike(num_hex)')).toBe(false);
    expect(await evaluator.eval('IsHexLike(num_float)')).toBe(false);
    expect(await evaluator.eval('IsHexLike(num_float_like)')).toBe(false);
    expect(await evaluator.eval('IsHexLike(num_int)')).toBe(false);
    expect(await evaluator.eval('IsHexLike(num_int_like)')).toBe(false);
    expect(await evaluator.eval('IsHexLike(arr)')).toBe(false);
  });
  test('eval libraries (IsPrimitive)', async(): Promise<void> => {
    expect(await evaluator.eval('IsPrimitive(str_alpha)')).toBe(true);
    expect(await evaluator.eval('IsPrimitive(num_int)')).toBe(true);
    expect(await evaluator.eval('IsPrimitive(undefined)')).toBe(false);
    expect(await evaluator.eval('IsPrimitive(obj)')).toBe(false);
    expect(await evaluator.eval('IsPrimitive(arr)')).toBe(false);
  });
  test('eval libraries (IsObject)', async(): Promise<void> => {
    expect(await evaluator.eval('IsObject(obj)')).toBe(true);
    expect(await evaluator.eval('IsObject(arr)')).toBe(true);
    expect(await evaluator.eval('IsObject(str_alpha)')).toBe(false);
    expect(await evaluator.eval('IsObject(num_int)')).toBe(false);
    expect(await evaluator.eval('IsObject(undefined)')).toBe(false);
  });
  test('eval libraries (IsAlpha)', async(): Promise<void> => {
    expect(await evaluator.eval('IsAlpha(str_alpha)')).toBe(true);
    expect(await evaluator.eval('IsAlpha(str_alnum)')).toBe(false);
    expect(await evaluator.eval('IsAlpha(str_not_alnum)')).toBe(false);
    expect(await evaluator.eval('IsAlpha(num_int)')).toBe(false);
    expect(await evaluator.eval('IsAlpha(undefined)')).toBe(false);
    expect(await evaluator.eval('IsAlpha(obj)')).toBe(false);
    expect(await evaluator.eval('IsAlpha(arr)')).toBe(false);
  });
  test('eval libraries (IsAlnum)', async(): Promise<void> => {
    expect(await evaluator.eval('IsAlnum(str_alpha)')).toBe(true);
    expect(await evaluator.eval('IsAlnum(str_alnum)')).toBe(true);
    expect(await evaluator.eval('IsAlnum(str_not_alnum)')).toBe(false);
    expect(await evaluator.eval('IsAlnum(num_int)')).toBe(false);
    expect(await evaluator.eval('IsAlnum(undefined)')).toBe(false);
    expect(await evaluator.eval('IsAlnum(obj)')).toBe(false);
    expect(await evaluator.eval('IsAlnum(arr)')).toBe(false);
  });
  test('eval libraries (IsUpper)', async(): Promise<void> => {
    expect(await evaluator.eval('IsUpper(str_upper)')).toBe(true);
    expect(await evaluator.eval('IsUpper(str_alpha)')).toBe(false);
    expect(await evaluator.eval('IsUpper(str_alnum)')).toBe(false);
    expect(await evaluator.eval('IsUpper(str_not_alnum)')).toBe(false);
    expect(await evaluator.eval('IsUpper(num_int)')).toBe(false);
    expect(await evaluator.eval('IsUpper(undefined)')).toBe(false);
    expect(await evaluator.eval('IsUpper(obj)')).toBe(false);
    expect(await evaluator.eval('IsUpper(arr)')).toBe(false);
  });
  test('eval libraries (IsLower)', async(): Promise<void> => {
    expect(await evaluator.eval('IsLower(str_lower)')).toBe(true);
    expect(await evaluator.eval('IsLower(str_upper)')).toBe(false);
    expect(await evaluator.eval('IsLower(str_alpha)')).toBe(false);
    expect(await evaluator.eval('IsLower(str_alnum)')).toBe(false);
    expect(await evaluator.eval('IsLower(str_not_alnum)')).toBe(false);
    expect(await evaluator.eval('IsLower(num_int)')).toBe(false);
    expect(await evaluator.eval('IsLower(undefined)')).toBe(false);
    expect(await evaluator.eval('IsLower(obj)')).toBe(false);
    expect(await evaluator.eval('IsLower(arr)')).toBe(false);
  });
  test('eval libraries (IsTime)', async(): Promise<void> => {
    expect(await evaluator.eval('IsTime(str_time)')).toBe(true);
    expect(await evaluator.eval('IsTime(str_alpha)')).toBe(false);
    expect(await evaluator.eval('IsTime(str_alnum)')).toBe(false);
    expect(await evaluator.eval('IsTime(str_not_alnum)')).toBe(false);
    expect(await evaluator.eval('IsTime(num_int)')).toBe(false);
    expect(await evaluator.eval('IsTime(undefined)')).toBe(false);
    expect(await evaluator.eval('IsTime(obj)')).toBe(false);
    expect(await evaluator.eval('IsTime(arr)')).toBe(false);
  });
  test('eval libraries (IsSpace)', async(): Promise<void> => {
    expect(await evaluator.eval('IsSpace(str_space)')).toBe(true);
    expect(await evaluator.eval('IsSpace(str_time)')).toBe(false);
    expect(await evaluator.eval('IsSpace(str_alpha)')).toBe(false);
    expect(await evaluator.eval('IsSpace(str_alnum)')).toBe(false);
    expect(await evaluator.eval('IsSpace(str_not_alnum)')).toBe(false);
    expect(await evaluator.eval('IsSpace(num_int)')).toBe(false);
    expect(await evaluator.eval('IsSpace(undefined)')).toBe(false);
    expect(await evaluator.eval('IsSpace(obj)')).toBe(false);
    expect(await evaluator.eval('IsSpace(arr)')).toBe(false);
  });
  test('eval libraries (IsClass)', async(): Promise<void> => {
    expect(await evaluator.eval('IsClass(T)')).toBe(true);
    expect(await evaluator.eval('IsClass(T, "T")')).toBe(true);
    expect(await evaluator.eval('IsClass(T, T)')).toBe(true);
    expect(await evaluator.eval('IsClass(2, "T")')).toBe(false);
    expect(await evaluator.eval('IsClass(instance)')).toBe(false);
    expect(await evaluator.eval('IsClass(str_alpha)')).toBe(false);
    expect(await evaluator.eval('IsClass(num_int)')).toBe(false);
    expect(await evaluator.eval('IsClass(undefined)')).toBe(false);
    expect(await evaluator.eval('IsClass(obj)')).toBe(false);
    expect(await evaluator.eval('IsClass(arr)')).toBe(false);
  });
  test.skip('Even if all tests succeed, test suite is treated as a failure. For some reason, adding skip solves this problem.', async(): Promise<void> => {
  });
});

describe('ExpressionEvaluator for AutoHotkey-v2', (): void => {
  let process: ChildProcess;
  let server: net.Server;
  let session: dbgp.Session;
  let evaluator: ExpressionEvaluator;

  beforeAll(async() => {
    const data = await launchDebug('v2/AutoHotkey.exe', path.resolve(sampleDir, 'sample.ahk2'), port + 1, hostname);
    process = data.process;
    server = data.server;
    session = data.session;
    evaluator = data.evaluator;
  });
  afterAll(async() => {
    process.kill();
    server.close();
    await session.close();
  });

  test('eval libraries (IsNumber)', async(): Promise<void> => {
    expect(await evaluator.eval('IsNumber(num_int)')).toBe(true);
    expect(await evaluator.eval('IsNumber(num_float)')).toBe(true);
    expect(await evaluator.eval('IsNumber(num_hex)')).toBe(true);
    expect(await evaluator.eval('IsNumber(num_scientific_notation)')).toBe(true);
    expect(await evaluator.eval('IsNumber(str_alpha)')).toBe(false);
    expect(await evaluator.eval('IsNumber(arr)')).toBe(false);
  });
  test('eval libraries (IsNumberLike)', async(): Promise<void> => {
    expect(await evaluator.eval('IsNumberLike(num_int)')).toBe(true);
    expect(await evaluator.eval('IsNumberLike(num_int_like)')).toBe(true);
    expect(await evaluator.eval('IsNumberLike(arr)')).toBe(false);
  });
  test('eval libraries (IsInteger)', async(): Promise<void> => {
    expect(await evaluator.eval('IsInteger(num_int)')).toBe(true);
    expect(await evaluator.eval('IsInteger(num_int_like)')).toBe(false);
    expect(await evaluator.eval('IsInteger(str_alpha)')).toBe(false);
    expect(await evaluator.eval('IsInteger(arr)')).toBe(false);
  });
  test('eval libraries (IsIntegerLike)', async(): Promise<void> => {
    expect(await evaluator.eval('IsIntegerLike(num_int)')).toBe(true);
    expect(await evaluator.eval('IsIntegerLike(num_int_like)')).toBe(true);
    expect(await evaluator.eval('IsIntegerLike(num_float)')).toBe(false);
    expect(await evaluator.eval('IsIntegerLike(arr)')).toBe(false);
  });
  test('eval libraries (IsFloat)', async(): Promise<void> => {
    expect(await evaluator.eval('IsFloat(num_float)')).toBe(true);
    expect(await evaluator.eval('IsFloat(num_float_like)')).toBe(false);
    expect(await evaluator.eval('IsFloat(num_int)')).toBe(false);
    expect(await evaluator.eval('IsFloat(num_int_like)')).toBe(false);
    expect(await evaluator.eval('IsFloat(str_alpha)')).toBe(false);
    expect(await evaluator.eval('IsFloat(arr)')).toBe(false);
  });
  test('eval libraries (IsFloatLike)', async(): Promise<void> => {
    expect(await evaluator.eval('IsFloatLike(num_float)')).toBe(true);
    expect(await evaluator.eval('IsFloatLike(num_float_like)')).toBe(true);
    expect(await evaluator.eval('IsFloatLike(num_int)')).toBe(false);
    expect(await evaluator.eval('IsFloatLike(num_int_like)')).toBe(false);
    expect(await evaluator.eval('IsFloatLike(arr)')).toBe(false);
  });
  test.skip('Even if all tests succeed, test suite is treated as a failure. For some reason, adding skip solves this problem.', async(): Promise<void> => {
  });
});
