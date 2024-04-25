import { Socket, createServer } from 'net';
import { EventEmitter } from 'events';
import * as dbgp from '../types/dbgp/AutoHotkeyDebugger.types';
import { parseXml } from '../tools/xml';
import { AutoHotkeyProcess, Breakpoint, CallStack, CloseListener, CommandSender, Context, ErrorListener, ExceptionBreakpoint, ExecResult, LineBreakpoint, MessageListener, ObjectProperty, PendingCommand, PrimitiveProperty, Property, ScriptStatus, Session, SessionCommunicator, SessionConnector, contextNameById } from '../types/dbgp/session.types';
import { createCommandArgs, encodeToBase64, toDbgpFileName, toFsPath } from './utils';
import { timeoutPromise } from '../tools/promise';
import { DbgpError } from './error';
import { measureAsyncExecutionTime } from '../tools/time';
import { ParsedAutoHotkeyVersion } from '../types/tools/autohotkey/version/common.types';
import { parseAutoHotkeyVersion } from '../tools/autohotkey/version';

export const createSessionConnector = (): SessionConnector => {
  return {
    async connect(port: number, hostname: string, process?: AutoHotkeyProcess): Promise<Session> {
      return new Promise((resolve) => {
        createServer((socket) => {
          createSessionCommunicator(socket, process).then((communicator) => {
            createSession(communicator).then((session) => {
              resolve(session);
            });
          });
        }).listen(port, hostname);
      });
    },
  };
};
export const createSessionCommunicator = async(socket: Socket, process?: AutoHotkeyProcess): Promise<SessionCommunicator> => {
  const responseEventName = 'response';
  const pendingCommands = new Map<number, PendingCommand>();

  let currentTransactionId = 1;
  let isTerminated = false;
  let packetBuffer: Buffer | undefined;

  const eventEmitter = registerEvents();
  return new Promise((resolve) => {
    eventEmitter.once('debugger:init', (initPacket: dbgp.InitPacket) => {
      const communicator: SessionCommunicator = {
        initPacket,
        get isTerminated() {
          return isTerminated;
        },
        process,
        sendCommand: async<T extends dbgp.CommandResponse = dbgp.CommandResponse>(commandName: dbgp.CommandName, args?: Array<string | number | boolean | undefined>, data?: string): Promise<T> => {
          const transactionId = currentTransactionId++;
          if (communicator.isTerminated) {
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

            pendingCommands.set(transactionId, { request: command_str, resolve });
            socket.write(Buffer.from(`${command_str}\0`), (err) => {
              if (err) {
                reject(new Error('Some error occurred when writing.'));
              }
            });
          });
        },
        close: async(timeout_ms = 500) => {
          await closeProcess(timeout_ms);
          await closeSocket();
        },
        detach: async(timeout_ms = 500) => {
          await detachProcess(timeout_ms);
          await closeSocket();
        },
        onStdOut: (listener: MessageListener) => {
          eventEmitter.on('debugger:stdout', listener);
          eventEmitter.on('process:stdout', listener);
        },
        onStdErr: (listener: MessageListener) => {
          eventEmitter.on('debugger:stderr', listener);
          eventEmitter.on('process:stderr', listener);
        },
        onWarning: (listener: MessageListener) => {
          eventEmitter.on('debugger:warning', listener);
        },
        onOutputDebug: (listener: MessageListener) => {
          eventEmitter.on('debugger:outputdebug', listener);
        },
        onClose: (listener: CloseListener) => {
          eventEmitter.on('debugger:close', listener);
          eventEmitter.on('process:close', listener);
        },
        onError: (listener: ErrorListener) => {
          eventEmitter.on('debugger:error', listener);
          eventEmitter.on('process:error', listener);
        },
      };
      resolve(communicator);

      async function closeSocket(): Promise<void> {
        if (isTerminated) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          socket.end(() => {
            socket.destroy();
            resolve();
          });
        });
      }
      async function closeProcess(timeout_ms = 500): Promise<void> {
        if (!communicator.isTerminated) {
          if (communicator.process?.isTerminated) {
            communicator.process.kill();
          }
          return;
        }

        if (communicator.process) {
          communicator.process.isTerminated = true;
        }
        await timeoutPromise(communicator.sendCommand('stop'), timeout_ms).catch(() => {
          process?.kill();
        });
      }
      async function detachProcess(timeout_ms = 500): Promise<void> {
        if (!communicator.isTerminated) {
          return;
        }

        if (communicator.process) {
          communicator.process.isTerminated = true;
        }
        await timeoutPromise(communicator.sendCommand('detach'), timeout_ms);
      }
    });
  });

  function registerEvents(): EventEmitter {
    const eventEmitter = new EventEmitter();

    // #region process events
    process?.on('close', (exitCode?: number) => {
      process.isTerminated = true;
      eventEmitter.emit('process:close', exitCode, 'process');
    });
    process?.on('error', (exitCode?: number) => {
      process.isTerminated = true;
      eventEmitter.emit('process:error', exitCode, 'process');
    });
    process?.stdout.on('data', (data) => {
      eventEmitter.emit('process:stdout', data === undefined ? undefined : String(data), 'process');
    });
    process?.stderr.on('data', (data?) => {
      eventEmitter.emit('process:stderr', data === undefined ? undefined : String(data), 'process');
    });
    // #endregion process events

    // #region socket events
    socket.on('data', handlePacket);
    socket.on('close', () => {
      isTerminated = true;
      eventEmitter.emit('debugger:close', 'debugger');
    });
    socket.on('error', () => {
      isTerminated = true;
      eventEmitter.emit('debugger:error', 'debugger');
    });
    socket.on('disconnect', () => {
      isTerminated = true;
      eventEmitter.emit('debugger:close', 'debugger');
    });
    socket.on('exit', () => {
      eventEmitter.emit('debugger:close', 'debugger');
    });
    socket.on(responseEventName, (packet: dbgp.Packet) => {
      if ('init' in packet) {
        eventEmitter.emit('debugger:init', packet);
        return;
      }

      if ('stream' in packet) {
        const { type, content } = packet.stream.attributes;
        const message = Buffer
          .from(content, 'base64')
          .toString('utf8')
          .replace('\0', '')
          .toString();
        switch (type) {
          case 'stdout': eventEmitter.emit('debugger:warning', message, 'debugger'); break;
          case 'stderr': eventEmitter.emit('debugger:outputdebug', message, 'debugger'); break;
          default: break;
        }
        return;
      }

      if ('response' in packet) {
        const currentTransactionId = Number(packet.response.attributes.transaction_id);
        if (pendingCommands.has(currentTransactionId)) {
          const pendingCommand = pendingCommands.get(currentTransactionId)!;
          pendingCommands.delete(currentTransactionId);

          const response = packet.response;
          response.command = pendingCommand.request;
          pendingCommand.resolve(response);
        }
      }
    });
    // #endregion socket events

    return eventEmitter;
  }
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

      const restPacket = Uint8Array.prototype.slice.call(currentPacket, terminatorIndex + 1);
      if (0 < restPacket.length) {
        handlePacket(Buffer.from(restPacket));
      }
      return;
    }

    // Wait for next packet
    packetBuffer = currentPacket;
  }
};
export const createSession = async(communicator: SessionCommunicator): Promise<Session> => {
  const version = await getLanguageVersion(communicator.sendCommand);
  const session: Session = {
    version,
    ...communicator,
    // #region setting
    async suppressException(): Promise<boolean> {
      const response = await communicator.sendCommand('property_set', [ '-n', '<exception>' ], '');
      if (response.error) {
        throw new DbgpError(Number(response.error.attributes.code));
      }
      return true;
    },
    // #endregion setting
    // #region execuation
    async exec(command: dbgp.ContinuationCommandName): Promise<ExecResult> {
      const [ response, elapsedTime ] = await measureAsyncExecutionTime(async() => communicator.sendCommand<dbgp.ContinuationResponse>(command));
      if (response.error) {
        throw new DbgpError(Number(response.error.attributes.code));
      }

      return {
        elapsedTime,
        command,
        runState: response.attributes.status,
        reason: response.attributes.reason,
      };
    },
    async break(): Promise<ScriptStatus> {
      const response = await communicator.sendCommand<dbgp.BreakResponse>('break');
      if (response.error) {
        throw new DbgpError(Number(response.error.attributes.code));
      }
      return {
        reason: 'ok',
        runState: 'break',
      };
    },
    async close(timeout_ms = 500): Promise<void> {
      return communicator.close(timeout_ms);
    },
    async detach(timeout_ms = 500): Promise<void> {
      return communicator.detach(timeout_ms);
    },
    // #endregion execuation
    // #region execuation context
    async getScriptStatus(): Promise<ScriptStatus> {
      const response = await communicator.sendCommand<dbgp.StatusResponse>('status');
      if (response.error) {
        throw new DbgpError(Number(response.error.attributes.code));
      }

      return {
        reason: response.attributes.reason,
        runState: response.attributes.status,
      };
    },
    async getCallStack(): Promise<CallStack> {
      const response = await communicator.sendCommand<dbgp.StackGetResponse>('stack_get');
      if (response.error) {
        throw new DbgpError(Number(response.error.attributes.code));
      }

      if (!response.stack) {
        return [
          {
            where: 'Standby',
            fileName: communicator.process?.program ?? '',
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
    getContext: async(contextId: number, depth?: number): Promise<Context> => {
      const response = await communicator.sendCommand<dbgp.ContextGetResponse>('context_get', [ '-c', contextId, '-d', depth ]);
      if (response.error) {
        throw new DbgpError(Number(response.error.attributes.code));
      }

      return {
        id: contextId,
        name: contextNameById[contextId],
        properties: toProperties(response.property, contextId, depth),
      };
    },
    async getContexts(depth?: number): Promise<Context[]> {
      const contexts: Context[] = [];
      const response = await communicator.sendCommand<dbgp.ContextNamesResponse>('context_names');
      for await (const context of response.context) {
        contexts.push(await session.getContext(Number(context.attributes.id), depth));
      }
      return contexts;
    },
    async getProperty(contextId: dbgp.ContextId, name: string, depth?: number): Promise<Property> {
      const response = await communicator.sendCommand<dbgp.PropertyGetResponse>('property_get', [ '-c', contextId, '-n', name, '-d', depth ]);
      if (response.error) {
        throw new DbgpError(Number(response.error.attributes.code));
      }
      if (response.property.attributes.type === 'object') {
        return toObjectProperty(response.property as dbgp.ObjectProperty, contextId, depth);
      }
      return toPrimitiveProperty(response.property as dbgp.PrimitiveProperty, contextId, depth);
    },
    async setProperty({ contextId, name, value, type, depth }): Promise<Property> {
      let propertyValue = String(value);
      if (typeof value === 'boolean') {
        propertyValue = value ? '1' : '0';
      }

      let dataType = type;
      if (dataType === 'integer' && String(value).includes('.')) {
        dataType = 2 <= version.mejor ? 'float' : 'string';
      }
      else if (dataType === undefined) {
        switch (typeof value) {
          case 'string':
          case 'boolean': dataType = 'string'; break;
          case 'number': dataType = String(value).includes('.') ? 'float' : 'integer'; break;
          default: break;
        }
      }
      await communicator.sendCommand('property_set', [ '-c', contextId, '-n', name, '-t', dataType ], propertyValue);
      return this.getProperty(contextId, name, depth);
    },
    // #endregion execuation context
    // #region breakpoint
    async setExceptionBreakpoint(state: boolean): Promise<ExceptionBreakpoint> {
      const setResponse = await communicator.sendCommand<dbgp.BreakpointSetResponse>('breakpoint_set', [ '-t', 'exception', '-s', state ? 'enabled' : 'disabled' ]);
      if (setResponse.error) {
        throw new DbgpError(Number(setResponse.error.attributes.code));
      }
      return {
        type: 'exception',
        state: setResponse.attributes.state,
      };
    },
    async getBreakpointById<T extends Breakpoint = Breakpoint>(id: number): Promise<T> {
      const getResponse = await communicator.sendCommand<dbgp.BreakpointGetResponse>('breakpoint_get', [ '-d', id ]);
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
      const setResponse = await communicator.sendCommand<dbgp.BreakpointSetResponse>('breakpoint_set', [ '-t', 'line', '-f', fileUri, '-n', line_1base ]);
      if (setResponse.error) {
        throw new DbgpError(Number(setResponse.error.attributes.code));
      }

      return this.getBreakpointById<LineBreakpoint>(Number(setResponse.attributes.id));
    },
    async removeBreakpointById(id: number): Promise<void> {
      const response = await communicator.sendCommand<dbgp.BreakpointRemoveResponse>('breakpoint_remove', [ '-d', id ]);
      if (response.error) {
        throw new DbgpError(Number(response.error.attributes.code));
      }
    },
    // #endregion breakpoint
  };
  return session;

  // #region utils
  async function getLanguageVersion(sendCommand: CommandSender): Promise<ParsedAutoHotkeyVersion> {
    const response = await sendCommand<dbgp.FeatureGetResponse>('feature_get', [ '-n', 'language_version' ]);
    if (response.error) {
      throw new DbgpError(Number(response.error.attributes.code));
    }
    return parseAutoHotkeyVersion(response.content);
  }
  function toProperties(dbgpProperty: dbgp.Property | dbgp.Property[] | undefined, contextId: dbgp.ContextId, depth?: number): Property[] {
    if (!dbgpProperty) {
      return [];
    }

    const rawProperties = Array.isArray(dbgpProperty) ? dbgpProperty : [ dbgpProperty ];
    return rawProperties.map((rawProperty) => {
      if (rawProperty.attributes.type === 'object') {
        return toObjectProperty(rawProperty as dbgp.ObjectProperty, contextId, depth);
      }
      return toPrimitiveProperty(rawProperty as dbgp.PrimitiveProperty, contextId, depth);
    });
  }
  function toPrimitiveProperty(rawProperty: dbgp.PrimitiveProperty, contextId: dbgp.ContextId, depth?: number): PrimitiveProperty {
    return {
      contextId,
      depth,
      name: rawProperty.attributes.name,
      fullName: rawProperty.attributes.fullname,
      constant: rawProperty.attributes.constant === '1',
      size: Number(rawProperty.attributes.size),
      type: rawProperty.attributes.type,
      value: Buffer.from(rawProperty.content ?? '', 'base64').toString(),
    };
  }
  function toObjectProperty(rawProperty: dbgp.ObjectProperty, contextId: dbgp.ContextId, depth?: number): ObjectProperty {
    return {
      contextId,
      depth,
      name: rawProperty.attributes.name,
      fullName: rawProperty.attributes.fullname,
      className: rawProperty.attributes.classname,
      facet: rawProperty.attributes.facet,
      address: Number(rawProperty.attributes.address),
      hasChildren: rawProperty.attributes.children === '1',
      children: toProperties(rawProperty.property, contextId, depth),
      size: Number(rawProperty.attributes.size),
      type: 'object',
    };
  }
  // #endregion utils
};
