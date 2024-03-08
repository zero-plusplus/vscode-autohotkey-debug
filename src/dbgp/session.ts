import { Server, Socket, createServer } from 'net';
import EventEmitter from 'events';
import * as dbgp from '../types/dbgp/AutoHotkeyDebugger.types';
import { parseXml } from '../tools/xml';
import { Breakpoint, CommandSender, ExceptionBreakpoint, LineBreakpoint, Process, Session, SessionConnector } from '../types/dbgp/session.types';
import { createCommandArgs, encodeToBase64, toDbgpFileName, toFsPath } from './utils';
import { timeoutPromise } from '../tools/promise';
import { DbgpError } from './error';

const responseEventName = 'response';
export const createSessionConnector = (): SessionConnector => {
  let packetBuffer: Buffer | undefined;
  let isTerminatedProcess = false;

  return {
    async connect(port: number, hostname: string, process?: Process): Promise<Session> {
      return new Promise((resolve) => {
        const server = createServer((socket) => {
          socket.on('data', handlePacket);

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

              const xmlDocument = parseXml(xml_str);
              socket.emit(responseEventName, xmlDocument);

              const restPacket = currentPacket.slice(terminatorIndex + 1);
              if (0 < restPacket.length) {
                handlePacket(restPacket);
              }
              return;
            }

            // Wait for next packet
            packetBuffer = currentPacket;
          }
        })
          .listen(port, hostname)
          .on('connection', (socket) => {
            resolve(createSession(server, socket, process));
          });
      });
    },
  };

  function createSession(server: Server, socket: Socket, process?: Process): Session {
    const emitter = registerEvents();
    const sendCommand = createCommandSender(socket);

    return {
      on(eventName, litener): Session {
        emitter.on(eventName, litener);
        return this;
      },
      once(eventName, litener): Session {
        emitter.once(eventName, litener);
        return this;
      },
      off(eventName, litener): Session {
        emitter.off(eventName, litener);
        return this;
      },
      sendCommand,
      async getBreakpointById<T extends Breakpoint = Breakpoint>(id: number): Promise<T> {
        const getResponse = await sendCommand<dbgp.BreakpointGetResponse>('breakpoint_get', [ '-d', id ]);
        if (getResponse.error) {
          throw new DbgpError(Number(getResponse.error.attributes.code));
        }

        const attributes = getResponse.breakpoint.attributes;
        if (attributes.type === 'exception') {
          return {
            id,
            type: attributes.type,
            state: attributes.state,
          } as T;
        }
        return {
          id,
          type: attributes.type,
          fileName: toFsPath(attributes.filename),
          line: Number(attributes.lineno),
          state: attributes.state,
        } as T;
      },
      async setLineBreakpoint(fileName: string, line_1base: number): Promise<LineBreakpoint> {
        const fileUri = toDbgpFileName(fileName);
        const setResponse = await sendCommand<dbgp.BreakpointSetResponse>('breakpoint_set', [ '-t', 'line', '-f', fileUri, '-n', line_1base ]);
        if (setResponse.error) {
          throw new DbgpError(Number(setResponse.error.attributes.code));
        }

        return this.getBreakpointById<LineBreakpoint>(Number(setResponse.attributes.id));
      },
      async setExceptionBreakpoint(enabled: boolean): Promise<ExceptionBreakpoint> {
        const setResponse = await sendCommand<dbgp.BreakpointSetResponse>('breakpoint_set', [ '-t', 'exception', '-s', enabled ? 'enabled' : 'disabled' ]);
        if (setResponse.error) {
          throw new DbgpError(Number(setResponse.error.attributes.code));
        }
        return {
          type: 'exception',
          state: setResponse.attributes.state,
        };
      },
      async close(timeout_ms = 500): Promise<Error | undefined> {
        await closeProcess(timeout_ms);
        return closeSession();
      },
      async detach(timeout_ms = 500): Promise<Error | undefined> {
        await detachProcess(timeout_ms);
        return closeSession();
      },
    };

    async function closeSession(): Promise<Error | undefined> {
      return new Promise<Error | undefined>((resolve) => {
        socket.end(() => {
          server.close((err) => {
            resolve(err);
          });
        });
      });
    }
    async function closeProcess(timeout_ms: number): Promise<void> {
      if (isTerminatedProcess) {
        await timeoutPromise(sendCommand('stop'), timeout_ms);
        return;
      }
      process?.kill();
    }
    async function detachProcess(timeout_ms: number): Promise<void> {
      if (isTerminatedProcess) {
        await timeoutPromise(sendCommand('detach'), timeout_ms);
      }
    }

    function registerEvents(): EventEmitter {
      const responseEmitter = new EventEmitter();
      process?.on('close', (exitCode?: number) => {
        isTerminatedProcess = true;
        responseEmitter.emit('process:close', exitCode);
      });
      process?.on('error', (err) => {
        responseEmitter.emit('process:error', err);
      });
      process?.stdout.on('data', (data: Buffer) => {
        responseEmitter.emit('process:stdout', data.toString('utf-8'));
      });
      process?.stderr.on('data', (data: Buffer) => {
        responseEmitter.emit('process:stderr', data.toString('utf-8'));
      });
      socket.on('close', () => {
        isTerminatedProcess = true;
        responseEmitter.emit('debugger:close');
      });
      socket.on('error', () => {
        responseEmitter.emit('debugger:error');
      });
      socket.on(responseEventName, (packet: dbgp.Packet) => {
        if ('init' in packet) {
          responseEmitter.emit('debugger:init', packet.init.attributes);
          return;
        }

        if ('stream' in packet) {
          const { type, content } = packet.stream.attributes;
          const message = Buffer
            .from(content, 'base64')
            .toString('utf8')
            .replace('\0', '')
            .toString();
          responseEmitter.emit(`debugger:${type}`, message);
        }
      });
      server.on('close', () => {
        responseEmitter.emit('server:close');
      });
      server.on('error', (err) => {
        responseEmitter.emit('server:error', err);
      });
      return responseEmitter;
    }

    function createCommandSender(socket: Socket): CommandSender {
      let currentTransactionId = 1;

      const sendCommand = async<T extends dbgp.CommandResponse = dbgp.CommandResponse>(commandName: dbgp.CommandName, args?: Array<string | number | boolean | undefined>, data?: string): Promise<T> => {
        const transactionId = currentTransactionId++;
        return sendCommandRaw<T>(transactionId, commandName, args, data);
      };
      return sendCommand;

      async function sendCommandRaw<T extends dbgp.CommandResponse = dbgp.CommandResponse>(transactionId: number, commandName: string, args?: Array<string | number | boolean | undefined>, data?: string): Promise<T> {
        return new Promise((resolve, reject) => {
          let command_str = `${commandName} -i ${transactionId}`;
          if (Array.isArray(args)) {
            command_str += ` ${createCommandArgs(...args).join(' ')}`;
          }
          if (typeof data === 'string') {
            command_str += ` -- ${encodeToBase64(data)}`;
          }

          if (!socket.writable) {
            Promise.reject(new Error('Socket not writable.'));
            return;
          }

          socket.write(Buffer.from(`${command_str}\0`), (err) => {
            if (err) {
              reject(new Error('Some error occurred when writing.'));
            }
            socket.once(responseEventName, (packet: dbgp.CommandResponse) => {
              if ('response' in packet) {
                const response = packet.response as dbgp.CommandResponseBase;
                response.command = command_str;
                resolve(packet.response as T);
              }
            });
          });
        });
      }
    }
  }
};
