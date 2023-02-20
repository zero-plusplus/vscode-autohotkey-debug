import * as net from 'net';
import { ChildProcess } from 'child_process';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import * as dbgp from '../../src/dbgpSession';
import { ExpressionEvaluator } from '../../src/util/evaluator/ExpressionEvaluator';
import { closeSession, launchDebug } from '../util';
import { LogData, LogEvaluator } from '../../src/util/evaluator/LogEvaluator';

const sampleDir = path.resolve(__dirname, 'ahk');
const hostname = '127.0.0.1';

const simplifyDataList = (dataList: LogData[]): any => {
  return dataList.map((data) => {
    if (data.type === 'primitive') {
      return {
        ...data,
        prefixes: data.prefixes.map((prefix) => {
          return prefix.value;
        }),
      };
    }

    return {
      ...data,
      prefixes: data.prefixes.map((prefix) => {
        return prefix.value;
      }),
      value: data.value.map((value) => {
        return typeof value === 'object' ? value.name : value;
      }),
    };
  });
};

describe('LogEvaluator for AutoHotkey-v1', (): void => {
  let process: ChildProcess;
  let server: net.Server | undefined;
  let session: dbgp.Session;
  let evaluator: LogEvaluator;

  beforeAll(async() => {
    const data = await launchDebug('AutoHotkey.exe', path.resolve(sampleDir, 'sample.ahk'), 49156, hostname);
    process = data.process;
    server = data.server;
    session = data.session;

    evaluator = new LogEvaluator(new ExpressionEvaluator(session));
  });
  afterAll(async() => {
    server?.close();
    await closeSession(session, process);
  });

  test('eval', async() => {
    expect(await evaluator.eval('label: {str_alpha}')).toEqual([ { type: 'primitive', prefixes: [], value: 'label: aBc' } ]);
    expect(simplifyDataList(await evaluator.eval('label: {str_alpha}{obj}'))).toEqual([ { type: 'object', prefixes: [], label: 'label: aBc', value: [ 'obj' ] } ]);
    expect(simplifyDataList(await evaluator.eval('[obj]{obj}'))).toEqual([ { type: 'object', prefixes: [], label: '[obj]', value: [ 'obj' ] } ]);
    expect(simplifyDataList(await evaluator.eval('[obj, T]{obj}{T}'))).toEqual([ { type: 'object', prefixes: [], label: '[obj, T]', value: [ 'obj', 'T' ] } ]);

    expect(simplifyDataList(await evaluator.eval('label: {str_alpha}{obj}label: {str_alpha}'))).toEqual([
      { type: 'object', prefixes: [], label: 'label: aBc', value: [ 'obj' ] },
      { type: 'primitive', prefixes: [], value: 'label: aBc' },
    ]);
    expect(simplifyDataList(await evaluator.eval('label: {str_alpha}{obj}[obj, T]{obj}{T}'))).toEqual([
      { type: 'object', prefixes: [], label: 'label: aBc', value: [ 'obj' ] },
      { type: 'object', prefixes: [], label: '[obj, T]', value: [ 'obj', 'T' ] },
    ]);
  });
  test('eval with prefix', async() => {
    expect(simplifyDataList(await evaluator.eval('{:break:}label: {str_alpha}'))).toEqual([ { type: 'primitive', prefixes: [ 'break' ], value: 'label: aBc' } ]);
    expect(simplifyDataList(await evaluator.eval('{:break:}{:error:}label: {str_alpha}{:break:}'))).toEqual([
      { type: 'primitive', prefixes: [ 'break', 'error' ], value: 'label: aBc' },
      { type: 'primitive', prefixes: [ 'break' ], value: '' },
    ]);
    expect(simplifyDataList(await evaluator.eval('{:start:}A{:startCollapsed:}A-A{:end:}{:end:}'))).toEqual([
      { type: 'primitive', prefixes: [ 'start' ], value: 'A' },
      { type: 'primitive', prefixes: [ 'startCollapsed' ], value: 'A-A' },
      { type: 'primitive', prefixes: [ 'end', 'end' ], value: '' },
    ]);
  });
});
