import * as net from 'net';
import { ChildProcess } from 'child_process';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import * as dbgp from '../../../../src/dap/dbgpSession';
import { closeSession, launchDebug } from '../../../util';
import { LogData, LogEvaluator } from '../../../../src/dap/tools/LogMessageFormatter';
import { fixturesDataDirectory } from '../../../config';

const sampleDir = path.resolve(fixturesDataDirectory, 'tools', 'AELL');
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

describe('evaluator for AutoHotkey v1', (): void => {
  let process: ChildProcess;
  let server: net.Server | undefined;
  let session: dbgp.Session;
  let evaluator: LogEvaluator;

  beforeAll(async() => {
    const data = await launchDebug('AutoHotkey.exe', path.resolve(sampleDir, 'sample.ahk'), 49156, hostname);
    process = data.process;
    server = data.server;
    session = data.session;

    evaluator = new LogEvaluator(session);
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

  test('format specifiers', async(): Promise<void> => {
    expect(simplifyDataList(await evaluator.eval(`{123, b}`))).toEqual([ { type: 'primitive', prefixes: [], value: '1111011' } ]);
    expect(simplifyDataList(await evaluator.eval(`{123, d}`))).toEqual([ { type: 'primitive', prefixes: [], value: '123' } ]);
    expect(simplifyDataList(await evaluator.eval(`{0x123, d}`))).toEqual([ { type: 'primitive', prefixes: [], value: '291' } ]);
    expect(simplifyDataList(await evaluator.eval(`{123, o}`))).toEqual([ { type: 'primitive', prefixes: [], value: '173' } ]);
    expect(simplifyDataList(await evaluator.eval(`{123, x}`))).toEqual([ { type: 'primitive', prefixes: [], value: '0x7b' } ]);
    expect(simplifyDataList(await evaluator.eval(`{123, h}`))).toEqual([ { type: 'primitive', prefixes: [], value: '0x7b' } ]);
    expect(simplifyDataList(await evaluator.eval(`{123, X}`))).toEqual([ { type: 'primitive', prefixes: [], value: '0x7B' } ]);
    expect(simplifyDataList(await evaluator.eval(`{123, H}`))).toEqual([ { type: 'primitive', prefixes: [], value: '0x7B' } ]);
    expect(simplifyDataList(await evaluator.eval(`{123, xb}`))).toEqual([ { type: 'primitive', prefixes: [], value: '7b' } ]);
    expect(simplifyDataList(await evaluator.eval(`{123, hb}`))).toEqual([ { type: 'primitive', prefixes: [], value: '7b' } ]);
    expect(simplifyDataList(await evaluator.eval(`{123, Xb}`))).toEqual([ { type: 'primitive', prefixes: [], value: '7B' } ]);
    expect(simplifyDataList(await evaluator.eval(`{123, Hb}`))).toEqual([ { type: 'primitive', prefixes: [], value: '7B' } ]);
    expect(simplifyDataList(await evaluator.eval(`{obj, J}`))).toEqual([ { type: 'primitive', prefixes: [], value: JSON.stringify({ key: 'value' }, undefined, 4) } ]);
    expect(simplifyDataList(await evaluator.eval(`{obj, Jo}`))).toEqual([ { type: 'primitive', prefixes: [], value: JSON.stringify({ key: 'value' }) } ]);
  });
});
