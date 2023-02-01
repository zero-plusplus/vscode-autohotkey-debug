import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import * as path from 'path';
import * as net from 'net';
import * as dbgp from '../../src/dbgpSession';
import { IntelliSense } from '../../src/util/IntelliSense';
import { ChildProcess } from 'child_process';
import { closeSession, getPort, launchDebug } from '../util';

const sampleDir = path.resolve(`${__dirname}/sample`);
const hostname = '127.0.0.1';
describe('IntelliSense for v1', () => {
  let session: dbgp.Session;
  let process: ChildProcess;
  let server: net.Server | undefined;
  let intellisense: IntelliSense;

  beforeAll(async() => {
    const data = await launchDebug('AutoHotkey.exe', path.resolve(sampleDir, 'A.ahk'), await getPort(hostname), hostname);
    process = data.process;
    server = data.server;
    session = data.session;
    intellisense = new IntelliSense(session);
  });
  afterAll(async() => {
    server?.close();
    await closeSession(session, process);
  });

  test('suggest', async() => {
    expect((await intellisense.getSuggestion('  obj.a.b.c.')).map((prop) => prop.fullName)).toStrictEqual(expect.arrayContaining([
      'obj.a.b.c.ddd',
      'obj.a.b.c.eee',
    ]));
    expect((await intellisense.getSuggestion('obj.a.b.c.e')).map((prop) => prop.fullName)).toStrictEqual(expect.arrayContaining([ 'obj.a.b.c.eee' ]));
    expect((await intellisense.getSuggestion('obj["a"]["b"]["c"]["')).map((prop) => prop.fullName)).toStrictEqual(expect.arrayContaining([
      'obj.a.b.c.ddd',
      'obj.a.b.c.eee',
    ]));
  });
});

