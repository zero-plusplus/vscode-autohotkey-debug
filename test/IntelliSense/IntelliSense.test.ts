import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import * as path from 'path';
import * as net from 'net';
import * as dbgp from '../../src/dap/dbgpSession';
import { CompletionItemConverter, IntelliSense } from '../../src/util/IntelliSense';
import { ChildProcess } from 'child_process';
import { closeSession, launchDebug } from '../util';

const sampleDir = path.resolve(`${__dirname}/sample`);
const hostname = '127.0.0.1';
describe('IntelliSense for v1', () => {
  let session: dbgp.Session;
  let process: ChildProcess;
  let server: net.Server | undefined;
  let intellisense: IntelliSense;

  beforeAll(async() => {
    const data = await launchDebug('AutoHotkey.exe', path.resolve(sampleDir, 'A.ahk'), 49153, hostname);
    process = data.process;
    server = data.server;
    session = data.session;
    intellisense = new IntelliSense(session);
  });
  afterAll(async() => {
    server?.close();
    await closeSession(session, process);
  });

  const converter: CompletionItemConverter<dbgp.Property> = async(p) => Promise.resolve(p);
  const suggest = async(text: string): Promise<string[]> => (await intellisense.getSuggestion(text, converter)).map((item) => item.name);
  test('simple', async() => {
    expect(await suggest('')).toStrictEqual(expect.arrayContaining([ 'A_Args' ]));
    expect(await suggest('obj[key]')).toStrictEqual(expect.arrayContaining([ 'A_Args' ]));
    expect(await suggest('obj.a.b.c.')).toStrictEqual(expect.arrayContaining([
      'ddd',
      'eee',
    ]));
    expect(await suggest('obj.a.b.c.e')).toStrictEqual(expect.arrayContaining([ 'eee' ]));
    expect(await suggest('obj["a"]["b"]["c"]["')).toStrictEqual(expect.arrayContaining([
      'ddd',
      'eee',
    ]));
    expect(await suggest('inst')).toStrictEqual(expect.arrayContaining([ 'instance' ]));
    expect(await suggest('instance.')).toStrictEqual(expect.arrayContaining([
      '<base>',
      '_property_baking',
      'baseInstanceField',
      'instanceField1',
      'instanceField2',
      '__Class',
      '__Init',
      'method',
      'property',
    ]));
    expect(await suggest('instance.instanceField2')).toStrictEqual(expect.arrayContaining([ 'instanceField2' ]));
    expect(await suggest('instance.instanceField2.a.b.c.')).toStrictEqual(expect.arrayContaining([
      'ddd',
      'eee',
    ]));
    expect(await suggest('instance.baseInstanceField.')).toStrictEqual(expect.arrayContaining([
      'a',
      'key',
    ]));
  });

  test('complex', async() => {
    expect(await suggest('abc obj.a.b.c.')).toStrictEqual(expect.arrayContaining([
      'ddd',
      'eee',
    ]));
    expect(await suggest('"abc obj.a.b.c.')).toStrictEqual(expect.arrayContaining([]));
    expect(await suggest('abc[" obj.a.b.c.')).toStrictEqual(expect.arrayContaining([]));
    // https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/186
    expect((await suggest('obj[key]obj')).includes('obj')).toBeTruthy();
    expect((await suggest('obj[key].'))).toStrictEqual(expect.arrayContaining([ 'nest' ]));
    expect(await suggest('obj[obj.')).toStrictEqual(expect.arrayContaining([
      'a',
      'key',
    ]));
    expect((await suggest('obj[')).slice(0, 3)).toStrictEqual(expect.arrayContaining([
      'a',
      'key',
      'A_Args',
    ]));
    expect((await suggest('obj[  ')).slice(0, 3)).toStrictEqual(expect.arrayContaining([
      'a',
      'key',
      'A_Args',
    ]));
    expect((await suggest('obj[  A_'))).toStrictEqual(expect.arrayContaining([ 'A_Args' ]));
    expect((await suggest('obj[obj . A_'))).toStrictEqual(expect.arrayContaining([ 'A_Args' ]));
    expect((await suggest('obj[ob'))).toStrictEqual(expect.arrayContaining([ 'obj' ]));
    expect((await suggest('obj[ob().a')).length).toStrictEqual(0);
    expect((await suggest('obj[key].')).length).toStrictEqual(1);
    expect((await suggest('a := ob'))).toStrictEqual(expect.arrayContaining([ 'obj' ]));
    expect((await suggest('a, ob'))).toStrictEqual(expect.arrayContaining([ 'obj' ]));
  });
});

