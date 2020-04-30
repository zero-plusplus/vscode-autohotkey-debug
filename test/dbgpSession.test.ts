import * as assert from 'assert';
import { DbgpSession, InitPacket } from '../src/dap/dbgpSession';
import * as net from 'net';

suite('Debug session test', () => {
  setup(function(done) {
    this.serverSocket = net.connect(9000, 'localhost');
    this.session = new DbgpSession(this.serverSocket);
    this.server = net.createServer((socket) => {
      this.socket = socket;
      done();
    }).listen(9000, 'localhost');
  });

  test('handlePacket', function(done) {
    const packets = [
      '2',
      '17\0',
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<init appid="AutoHotkey" ide_key="" session="" thread="7208" parent="" ',
      'language="AutoHotkey" protocol_version="1.0" fileuri="file:///W%3A/project/vscode-ahk-debug/demo/demo.ahk"/>\0',
    ];
    this.session.on('init', (response: InitPacket) => {
      assert.deepEqual(response, {
        appId: 'AutoHotkey',
        fileUri: 'file:///W%3A/project/vscode-ahk-debug/demo/demo.ahk',
        ideKey: '',
        language: 'AutoHotkey',
        parent: '',
        protocolVersion: '1.0',
        session: '',
        thread: '7208',
      });
    });
    this.serverSocket.on('data', () => {
      const packet = packets.shift();
      if (packet === undefined) {
        done();
        return;
      }
      this.socket.write(Buffer.from(String(packet)));
    });

    const packet = packets.shift();
    this.socket.write(Buffer.from(String(packet)));
  });
  teardown(function() {
    this.socket.end();
    this.session.close();
    this.server.close();
  });
});
