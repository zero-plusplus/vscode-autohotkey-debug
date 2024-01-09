import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import * as dbgp from '../src/dap/dbgpSession';
import * as net from 'net';

const hostname = '127.0.0.1';
describe('Debug session test', () => {
  let socket: net.Socket;
  let serverSocket: net.Socket;
  let server: net.Server;
  let session: dbgp.Session;
  beforeAll(async() => {
    const port = 49152;
    return new Promise<void>((resolve) => {
      server = net.createServer((_socket) => {
        socket = _socket;
        session = new dbgp.Session(socket);
        resolve();
      }).listen(port, hostname);
      serverSocket = net.connect(port, hostname);
    });
  });
  afterAll(function() {
    socket.end();
    session.close();
    server.close();
  });

  test('handlePacket', function(done) {
    const packets = [
      '2',
      '17\0',
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<init appid="AutoHotkey" ide_key="" session="" thread="7208" parent="" ',
      'language="AutoHotkey" protocol_version="1.0" fileuri="file:///W%3A/project/vscode-autohotkey-debug/demo/demo.ahk"/>\0',
    ];
    session.on('init', (response: dbgp.InitPacket) => {
      expect(response).toEqual(expect.objectContaining({
        appId: 'AutoHotkey',
        fileUri: 'file:///W%3A/project/vscode-autohotkey-debug/demo/demo.ahk',
        ideKey: '',
        language: 'AutoHotkey',
        parent: '',
        protocolVersion: '1.0',
        session: '',
        thread: '7208',
      }));
    });
    serverSocket.on('data', () => {
      const packet = packets.shift();
      if (typeof packet === 'undefined') {
        done();
        return;
      }
      socket.write(Buffer.from(String(packet)));
    });

    const packet = packets.shift();
    socket.write(Buffer.from(String(packet)));
  });
});
