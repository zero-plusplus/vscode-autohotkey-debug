import { Server, Socket, createServer } from 'net';
import { EventEmitter } from 'events';
import * as dbgp from '../types/dbgp/AutoHotkeyDebugger.types';
import { parseXml } from '../tools/xml';
import { AutoHotkeyProcess, Breakpoint, CallStack, CommandSender, Context, ContextName, ExceptionBreakpoint, ExecResult, LineBreakpoint, ObjectProperty, PrimitiveProperty, Property, ScriptStatus, Session, SessionConnector, contextIdByName } from '../types/dbgp/session.types';
import { createCommandArgs, encodeToBase64, toDbgpFileName, toFsPath } from './utils';
import { timeoutPromise } from '../tools/promise';
import { DbgpError } from './error';
import { measureAsyncExecutionTime } from '../tools/time';

const responseEventName = 'response';
export const createSessionConnector = (eventEmitter: EventEmitter): SessionConnector => {
  let packetBuffer: Buffer | undefined;

  return {
    async connect(port: number, hostname: string, process?: AutoHotkeyProcess): Promise<Session> {
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
              const data = Uint8Array.prototype.slice.call(currentPacket, 0, terminatorIndex);
              const isReceivedDataLength = !isNaN(parseInt(data.toString(), 10));
              if (isReceivedDataLength) {
                const responsePacket = Uint8Array.prototype.slice.call(currentPacket, terminatorIndex + 1);
                handlePacket(Buffer.from(responsePacket));
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

  function createSession(server: Server, socket: Socket, process?: AutoHotkeyProcess): Session {
    let isTerminatedProcess = false;

    registerEvents();
    const sendCommand = createCommandSender(socket);
    return {
      get isTerminatedProcess(): boolean {
        return isTerminatedProcess;
      },
      sendCommand,
      // #region setting
      async suppressException(): Promise<boolean> {
        const response = await sendCommand('property_set', [ '-n', '<exception>' ], '');
        if (response.error) {
          throw new DbgpError(Number(response.error.attributes.code));
        }
        return true;
      },
      // #endregion setting
      // #region execuation
      async exec(command: dbgp.ContinuationCommandName): Promise<ExecResult> {
        const [ response, elapsedTime ] = await measureAsyncExecutionTime(async() => sendCommand<dbgp.ContinuationResponse>(command));
        if (response.error) {
          throw new DbgpError(Number(response.error.attributes.code));
        }
        if (response.attributes.status === 'stopped') {
          isTerminatedProcess = true;
        }

        return {
          elapsedTime,
          command,
          runState: response.attributes.status,
          reason: response.attributes.reason,
        };
      },
      async break(): Promise<ScriptStatus> {
        const response = await sendCommand<dbgp.BreakResponse>('break');
        if (response.error) {
          throw new DbgpError(Number(response.error.attributes.code));
        }
        return {
          reason: 'ok',
          runState: 'break',
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
      // #endregion execuation
      // #region execuation context
      async getScriptStatus(): Promise<ScriptStatus> {
        const response = await sendCommand<dbgp.StatusResponse>('status');
        if (response.error) {
          throw new DbgpError(Number(response.error.attributes.code));
        }

        return {
          reason: response.attributes.reason,
          runState: response.attributes.status,
        };
      },
      async getCallStack(): Promise<CallStack> {
        const response = await sendCommand<dbgp.StackGetResponse>('stack_get');
        if (response.error) {
          throw new DbgpError(Number(response.error.attributes.code));
        }

        if (!response.stack) {
          return [
            {
              where: 'Standby',
              fileName: process?.program ?? '',
              level: 0,
              line: 0,
              type: 'file',
            },
          ];
        }

        const stackFrames = (Array.isArray(response.stack) ? response.stack : [ response.stack ]).map((frame) => frame.attributes);
        return stackFrames.map((stackFrame) => {
          return {
            fileName: toFsPath(stackFrame.filename),
            line: Number(stackFrame.lineno),
            level: Number(stackFrame.level),
            type: stackFrame.type,
            where: stackFrame.where,
          };
        });
      },
      async getContext(contextName: ContextName, depth?: number): Promise<Context> {
        const contextId = contextIdByName[contextName];
        const response = await sendCommand<dbgp.ContextGetResponse>('context_get', [ '-c', contextId, '-d', depth ]);
        if (response.error) {
          throw new DbgpError(Number(response.error.attributes.code));
        }

        return {
          id: contextId,
          name: contextName,
          properties: toProperties(response.property),
        };

        function toProperties(dbgpProperty?: dbgp.Property | dbgp.Property[]): Property[] {
          if (!dbgpProperty) {
            return [];
          }

          const rawProperties = Array.isArray(dbgpProperty) ? dbgpProperty : [ dbgpProperty ];
          return rawProperties.map((rawProperty) => {
            if (rawProperty.attributes.type === 'object') {
              return toObjectProperty(rawProperty as dbgp.ObjectProperty);
            }
            return toPrimitiveProperty(rawProperty as dbgp.PrimitiveProperty);
          });
        }
        function toPrimitiveProperty(rawProperty: dbgp.PrimitiveProperty): PrimitiveProperty {
          return {
            name: rawProperty.attributes.name,
            fullName: rawProperty.attributes.fullname,
            constant: rawProperty.attributes.constant === '1',
            size: Number(rawProperty.attributes.size),
            type: rawProperty.attributes.type,
            value: Buffer.from(rawProperty.content ?? '', 'base64').toString(),
          };
        }
        function toObjectProperty(rawProperty: dbgp.ObjectProperty): ObjectProperty {
          return {
            name: rawProperty.attributes.name,
            fullName: rawProperty.attributes.fullname,
            className: rawProperty.attributes.classname,
            facet: rawProperty.attributes.facet,
            address: Number(rawProperty.attributes.address),
            hasChildren: rawProperty.attributes.children === '1',
            children: toProperties(rawProperty.property),
            size: Number(rawProperty.attributes.size),
            type: 'object',
          };
        }
      },
      async getContexts(depth?: number): Promise<Context[]> {
        const contexts: Context[] = [];
        const response = await sendCommand<dbgp.ContextNamesResponse>('context_names');
        for await (const context of response.context) {
          contexts.push(await this.getContext(context.attributes.name, depth));
        }
        return contexts;
      },
      async getProperty(contextId: number, name: string, depth?: number): Promise<void> {
        const response = await sendCommand<dbgp.PropertyGetResponse>('property_get', [ '-c', contextId, '-n', name, '-d', depth ]);
        if (response.error) {
          throw new DbgpError(Number(response.error.attributes.code));
        }
        console.log(response);
      },
      // #endregion execuation context
      // #region breakpoint
      async setExceptionBreakpoint(state: boolean): Promise<ExceptionBreakpoint> {
        const setResponse = await sendCommand<dbgp.BreakpointSetResponse>('breakpoint_set', [ '-t', 'exception', '-s', state ? 'enabled' : 'disabled' ]);
        if (setResponse.error) {
          throw new DbgpError(Number(setResponse.error.attributes.code));
        }
        return {
          type: 'exception',
          state: setResponse.attributes.state,
        };
      },
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
      async removeBreakpointById(id: number): Promise<void> {
        const response = await sendCommand<dbgp.BreakpointRemoveResponse>('breakpoint_remove', [ '-d', id ]);
        if (response.error) {
          throw new DbgpError(Number(response.error.attributes.code));
        }
      },
      // #endregion breakpoint
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
      if (!isTerminatedProcess) {
        await timeoutPromise(sendCommand('stop'), timeout_ms);
        return;
      }
      process?.kill();
    }
    async function detachProcess(timeout_ms: number): Promise<void> {
      if (!isTerminatedProcess) {
        return;
      }
      await timeoutPromise(sendCommand('detach'), timeout_ms);
    }

    function registerEvents(): void {
      socket.on('close', () => {
        isTerminatedProcess = true;
        eventEmitter.emit('debugger:close');
      });
      socket.on('error', () => {
        eventEmitter.emit('debugger:error');
      });
      socket.on(responseEventName, (packet: dbgp.Packet) => {
        if ('init' in packet) {
          eventEmitter.emit('debugger:init', packet.init.attributes);
          return;
        }

        if ('stream' in packet) {
          const { type, content } = packet.stream.attributes;
          const message = Buffer
            .from(content, 'base64')
            .toString('utf8')
            .replace('\0', '')
            .toString();
          eventEmitter.emit(`debugger:${type}`, message);
        }
      });
      server.on('close', () => {
        eventEmitter.emit('server:close');
      });
      server.on('error', (err) => {
        eventEmitter.emit('server:error', err);
      });
    }

    function createCommandSender(socket: Socket): CommandSender {
      let currentTransactionId = 1;

      const sendCommand = async<T extends dbgp.CommandResponse = dbgp.CommandResponse>(commandName: dbgp.CommandName, args?: Array<string | number | boolean | undefined>, data?: string): Promise<T> => {
        const transactionId = currentTransactionId++;
        return sendCommandRaw<T>(transactionId, commandName, args, data);
      };
      return sendCommand;

      async function sendCommandRaw<T extends dbgp.CommandResponse = dbgp.CommandResponse>(transactionId: number, commandName: string, args?: Array<string | number | boolean | undefined>, data?: string): Promise<T> {
        if (isTerminatedProcess) {
          throw Error(`Session closed. Transmission of command "${commandName}" has been cancelled.`);
        }

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

            const listener = (packet: dbgp.ResponsePacket): void => {
              if ('response' in packet && Number(packet.response.attributes.transaction_id) === transactionId) {
                const response = packet.response;
                response.command = command_str;
                socket.off(responseEventName, listener);
                resolve(response as T);
              }
            };
            socket.on(responseEventName, listener);
          });
        });
      }
    }
  }
};
