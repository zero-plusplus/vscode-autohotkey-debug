/* eslint-disable func-style, @typescript-eslint/no-use-before-define */
import { Server, Socket } from 'net';
import * as parser from 'fast-xml-parser';
import * as he from 'he';
import { InitPacket, ResponsePacket, StreamPacket } from '../../../types/dbgp/ExtendAutoHotkeyDebugger';
import { messageEventName } from './constant';

export const createDebugServer = async(): Promise<[ Server, Socket ]> => {
  let packetBuffer: Buffer | undefined;

  return new Promise((resolve) => {
    const server = new Server((socket) => {
      socket.on('data', handlePacket);
      resolve([ server, socket ]);

      function handlePacket(packet: Buffer): void {
        // As shown in the example below, the data passed from dbgp is divided into data length and response.
        // https://xdebug.org/docs/dbgp#response
        //     data_length
        //     [NULL]
        //     <?xml version="1.0" encoding="UTF-8"?>
        //     <response xmlns="urn:debugger_protocol_v1"
        //               command="command_name"
        //               transaction_id="transaction_id"/>
        //     [NULL]
        const currentPacket = packetBuffer ? Buffer.concat([ packetBuffer, packet ]) : packet;
        packetBuffer = undefined;

        const terminatorIndex = currentPacket.indexOf(0);
        const isCompleteReceived = -1 < terminatorIndex;
        if (isCompleteReceived) {
          const data = currentPacket.slice(0, terminatorIndex);
          const isReceivedDataLength = !isNaN(parseInt(data.toString(), 10));
          if (isReceivedDataLength) {
            const responsePacket = currentPacket.slice(terminatorIndex + 1);
            handlePacket(responsePacket);
            return;
          }

          // Received response
          // https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/171
          // If it contains a newline, it should be escaped in an AutoHotkey-like manner.
          const xml_str = data.toString().replace(/\r\n/gu, '`r`n').replace(/\n/gu, '`n');

          const xmlDocument = parser.parse(xml_str, {
            attributeNamePrefix: '',
            attrNodeName: 'attributes',
            textNodeName: 'content',
            ignoreAttributes: false,
            parseNodeValue: false,
            attrValueProcessor: (value: string, attrName: string) => String(he.decode(value, { isAttributeValue: true })),
            tagValueProcessor: (value: string, tagName: string) => String(he.decode(value)),
          }) as Record<string, any>;

          switch (typeof xmlDocument === 'object') {
            case 'init' in xmlDocument: socket.emit(messageEventName, xmlDocument as InitPacket); break;
            case 'stream' in xmlDocument: socket.emit(messageEventName, xmlDocument as StreamPacket); break;
            case 'responce' in xmlDocument: socket.emit(messageEventName, xmlDocument as ResponsePacket); break;
            default: break;
          }

          const restPacket = currentPacket.slice(terminatorIndex + 1);
          if (0 < restPacket.length) {
            handlePacket(restPacket);
          }
          return;
        }

        // Wait for next packet
        packetBuffer = currentPacket;
      }
    });
  });
};
