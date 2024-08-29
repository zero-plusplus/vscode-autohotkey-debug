import { Server, Socket, createServer } from 'net';
import * as dbgp from '../types/dbgp/AutoHotkeyDebugger.types';
import { parseXml } from '../tools/xml';
import { AutoHotkeyProcess, BreakpointSetRequest, CommandArg, DebugServer, PendingCommand, Session, SessionCommunicator } from '../types/dbgp/session.types';
import { createCommandArgs, encodeToBase64 } from './utils';
import { createMutex, timeoutPromise, timeoutTask } from '../tools/promise';
import { DbgpError } from './error';
import { ParsedAutoHotkeyVersion } from '../types/tools/autohotkey/version/common.types';
import { parseAutoHotkeyVersion } from '../tools/autohotkey/version/parseAutoHotkeyVersion';
import { safeCallAsync } from '../tools/utils';
import { isNumber } from '../tools/predicate';

export const createDebugServer = (process?: AutoHotkeyProcess): DebugServer => {
  let isSocketTerminated = false;
  let isServerTerminated = false;
  let socket: Socket | undefined;
  let communicator: SessionCommunicator | undefined;
  let baseServer: Server;
  const debugServer: DebugServer = {
    get baseServer(): Server {
      return baseServer;
    },
    get socket(): Socket {
      if (socket === undefined) {
        throw Error('Socket not ready.');
      }
      return socket;
    },
    get communicator(): SessionCommunicator {
      if (communicator === undefined) {
        throw Error('Communicator not ready.');
      }
      return communicator;
    },
    process,
    get isTerminated(): boolean {
      return isServerTerminated && isSocketTerminated;
    },
    listen: async(port: number, hostname: string): Promise<Session> => {
      return new Promise((resolve) => {
        baseServer = createServer((_socket) => {
          socket = _socket;
          registerServerEvent(baseServer);
          registerProcessEvent(baseServer, process);
          registerSocketEvent(baseServer, socket);

          createSessionCommunicator(debugServer, process).then((_communicator) => {
            communicator = _communicator;
            resolve(createSession(communicator));
          });
        }).listen(port, hostname);
      });
    },
    close: async(timeout_ms = 500) => {
      await safeCallAsync(async() => closeProcess(debugServer, timeout_ms));
      await closeServer(debugServer);
    },
    detach: async(timeout_ms = 500) => {
      await safeCallAsync(async() => detachProcess(debugServer, timeout_ms));
      await closeServer(debugServer);
    },
  };
  return debugServer;

  function registerProcessEvent(server: Server, process?: AutoHotkeyProcess): void {
    process?.on('close', (exitCode?: number) => {
      if (process.isTerminated) {
        return;
      }

      process.isTerminated = true;
      server.emit('process:close', exitCode);
    });
    process?.on('error', (exitCode?: number) => {
      if (process.isTerminated) {
        return;
      }

      process.isTerminated = true;
      server.emit('process:error', exitCode);
    });
    process?.stdout.on('data', (data) => {
      if (data !== undefined) {
        server.emit('process:stdout', String(data));
      }
      server.emit('process:stdout', data === undefined ? undefined : String(data));
    });
    process?.stderr.on('data', (data?) => {
      server.emit('process:stderr', data === undefined ? undefined : String(data));
    });
  }
  function registerSocketEvent(server: Server, socket: Socket): void {
    socket.on('close', () => {
      if (isSocketTerminated) {
        return;
      }

      isSocketTerminated = true;
      server.emit('debugger:close', 'debugger');
    });
    socket.on('error', (err?: Error) => {
      if (isSocketTerminated) {
        return;
      }

      isSocketTerminated = true;
      server.emit('debugger:error', 'debugger', err);
    });
    socket.on('disconnect', () => {
      if (isSocketTerminated) {
        return;
      }

      isSocketTerminated = true;
      server.emit('debugger:close', 'debugger');
    });
    socket.on('exit', () => {
      if (isSocketTerminated) {
        return;
      }

      isSocketTerminated = true;
      server.emit('debugger:close', 'debugger');
    });
  }
  function registerServerEvent(server: Server): void {
    server.on('close', () => {
      if (isServerTerminated) {
        return;
      }

      isServerTerminated = true;
      server.emit('server:close', 'debugger');
    });
    server.on('error', () => {
      if (isServerTerminated) {
        return;
      }

      isServerTerminated = true;
      server.emit('server:error', 'debugger');
    });
    server.on('disconnect', () => {
      if (isServerTerminated) {
        return;
      }

      isServerTerminated = true;
      server.emit('server:close', 'debugger');
    });
    server.on('exit', () => {
      if (isServerTerminated) {
        return;
      }
      isServerTerminated = true;
      server.emit('server:close', 'debugger');
    });
  }
};

export async function createSessionCommunicator(server: DebugServer, process?: AutoHotkeyProcess): Promise<SessionCommunicator> {
  const initEventName = 'debugger:init';
  const responseEventName = 'debugger:response';
  const pendingCommands = new Map<number, PendingCommand>();
  const handlePacket = createPacketHandler(server.socket, responseEventName);

  let currentTransactionId = 1;
  return new Promise((resolve) => {
    server.socket.on('data', handlePacket);

    server.socket.on(responseEventName, (packet: dbgp.Packet) => {
      if ('init' in packet) {
        server.socket.emit(initEventName, packet);
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
          case 'stdout': server.socket.emit('debugger:stdout', message); break;
          case 'stderr': server.socket.emit('debugger:stderr', message); break;
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

    const rawSendCommandMutex = createMutex();
    server.socket.once(initEventName, (initPacket: dbgp.InitPacket) => {
      const communicator: SessionCommunicator = {
        initPacket,
        server,
        process,
        // #region For testing methods
        rawSendCommand: async <T extends dbgp.CommandResponse = dbgp.CommandResponse>(command: string): Promise<T> => {
          return rawSendCommandMutex.use('rawSendCommandMutex', async() => {
            return new Promise((resolve, reject) => {
              if (!server.socket.writable) {
                Promise.reject(new Error('Socket not writable.'));
                return;
              }

              server.socket.once(responseEventName, (packet) => {
                if ('response' in packet) {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  resolve(packet.response as T);
                }
              });
              server.socket.write(Buffer.from(`${command}\0`), (err) => {
                if (err) {
                  reject(new Error('Some error occurred when writing.'));
                }
              });
            });
          });
        },
        // #endregion For testing methods
        sendCommand: async<T extends dbgp.CommandResponse = dbgp.CommandResponse>(commandName: dbgp.CommandName, args?: Array<CommandArg | undefined>, data?: CommandArg): Promise<T> => {
          if (server.isTerminated) {
            throw Error(`Session closed. Transmission of command "${commandName}" has been cancelled.`);
          }

          return new Promise((resolve, reject) => {
            const transactionId = currentTransactionId++;
            let command_str = `${commandName} -i ${transactionId}`;
            if (Array.isArray(args)) {
              command_str += ` ${createCommandArgs(...args).join(' ')}`;
            }
            if (typeof data === 'string') {
              command_str += ` -- ${encodeToBase64(data)}`;
            }

            if (!server.socket.writable) {
              Promise.reject(new Error('Socket not writable.'));
              return;
            }

            // console.log(command_str);
            pendingCommands.set(transactionId, { request: command_str, resolve });
            server.socket.write(Buffer.from(`${command_str}\0`), (err) => {
              if (err) {
                reject(new Error('Some error occurred when writing.'));
              }
            });
          });
        },
      };
      resolve(communicator);
    });
  });
}

export function createPacketHandler(socket: Socket, responseEventName: string): (packet: Buffer) => void {
  let currentPacketLength: number | undefined;
  let currentPacketBuffer: Buffer | Uint8Array = Buffer.from('');

  return function handlePacket(packet: Buffer | Uint8Array): void {
    // As shown in the example below, the data passed from dbgp is divided into data length and response.
    // https://xdebug.org/docs/dbgp#response
    //     data_length
    //     [NULL]
    //     <?xml version="1.0" encoding="UTF-8"?>
    //     <response xmlns="urn:debugger_protocol_v1"
    //               command="command_name"
    //               transaction_id="transaction_id"/>
    //     [NULL]
    const currentPacket = Buffer.concat([ currentPacketBuffer, packet ]);
    currentPacketBuffer = Buffer.from('');

    const terminatorIndex = currentPacket.indexOf(0);
    const hasPacketTerminator = -1 < terminatorIndex;

    // Case 1: Receive data_length
    if (currentPacketLength === undefined) {
      const targetPacket = Uint8Array.prototype.slice.call(currentPacket, 0, terminatorIndex);
      // If the termination is not included, wait for the next packet
      if (!hasPacketTerminator) {
        currentPacketBuffer = targetPacket;
        return;
      }

      const nextPacketLength = parseInt(targetPacket.toString(), 10);
      if (!isNumber(nextPacketLength)) {
        throw Error('A lengthy response time was expected, but this was not the case.');
      }

      // Wait for packets of specified length
      currentPacketLength = nextPacketLength;
      const restPacket = Uint8Array.prototype.slice.call(currentPacket, terminatorIndex + 1);

      // Since this time it contains termination, the packet is analyzed again
      handlePacket(restPacket);
      return;
    }

    // Case 2: Finish receiving the packet
    if (currentPacketLength <= currentPacket.byteLength) {
      const targetPacket = Uint8Array.prototype.slice.call(currentPacket, 0, currentPacketLength);
      const restPacket = Uint8Array.prototype.slice.call(currentPacket, currentPacketLength + 1);

      currentPacketBuffer = restPacket;
      currentPacketLength = undefined;

      // Received response
      // https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/171
      // If it contains a newline, it should be escaped in an AutoHotkey-like manner.
      const xml_str = targetPacket.toString().replace(/\r\n/gu, '`r`n').replace(/\n/gu, '`n');
      const xmlDocument = parseXml(xml_str);
      socket.emit(responseEventName, xmlDocument);
      return;
    }

    // Case 3: Wait for the next packet as it has not yet received a packet of the specified length
    currentPacketBuffer = currentPacket;
  };
}
export async function closeServer(server: DebugServer): Promise<void> {
  return new Promise((resolve) => {
    server.socket.end(() => {
      server.socket.destroy();

      server.baseServer.close(() => {
        resolve();
      });
    });
  });
}
export async function closeProcess(server: DebugServer, timeout_ms = 500): Promise<void> {
  if (!server.process) {
    return;
  }
  if (server.process.isTerminated) {
    return;
  }

  if (server.socket.closed) {
    server.process.kill();
    server.process.isTerminated = true;
    return;
  }

  server.process.isTerminated = true;
  await timeoutTask(async() => sendContinuationCommand(server.communicator, 'stop'), timeout_ms).then(() => {
    server.process?.kill();
  });
}
export async function detachProcess(server: DebugServer, timeout_ms = 500): Promise<void> {
  if (!server.isTerminated) {
    return;
  }

  if (server.process) {
    server.process.isTerminated = true;
  }
  await timeoutPromise(sendContinuationCommand(server.communicator, 'detach'), timeout_ms);
}
export async function createSession(communicator: SessionCommunicator): Promise<Session> {
  const version = await (async(): Promise<ParsedAutoHotkeyVersion> => {
    const response = await sendFeatureGetCommand(communicator, 'language_version');
    return parseAutoHotkeyVersion(response.content);
  })();

  return {
    ahkVersion: version,
    ...communicator,
    sendStatusCommand: async(...args) => sendStatusCommand(communicator, ...args),
    sendFeatureGetCommand: async(...args) => sendFeatureGetCommand(communicator, ...args),
    sendFeatureSetCommand: async(...args) => sendFeatureSetCommand(communicator, ...args),
    sendContinuationCommand: async(...args) => sendContinuationCommand(communicator, ...args),
    sendBreakpointSetCommand: async(...args) => sendBreakpointSetCommand(communicator, ...args),
    sendBreakpointGetCommand: async(...args) => sendBreakpointGetCommand(communicator, ...args),
    sendBreakpointRemoveCommand: async(...args) => sendBreakpointRemoveCommand(communicator, ...args),
    sendStackGetCommand: async(...args) => sendStackGetCommand(communicator, ...args),
    sendContextNamesCommand: async(...args) => sendContextNamesCommand(communicator, ...args),
    sendContextGetCommand: async(...args) => sendContextGetCommand(communicator, ...args),
    sendPropertyGetCommand: async(...args) => sendPropertyGetCommand(communicator, ...args),
    sendPropertySetCommand: async(...args) => sendPropertySetCommand(communicator, ...args),
    sendBreakCommand: async(...args) => sendBreakCommand(communicator, ...args),
  };
}

// #region dbgp commands
// [7.1 status](https://xdebug.org/docs/dbgp#status)
export async function sendStatusCommand(communicator: SessionCommunicator): Promise<dbgp.StatusResponse> {
  const response = await communicator.sendCommand<dbgp.StatusResponse>('status');
  if (response.error) {
    throw new DbgpError(Number(response.error.attributes.code));
  }
  return response;
}

// [7.2.2 feature_get](https://xdebug.org/docs/dbgp#feature-get)
export async function sendFeatureGetCommand(communicator: SessionCommunicator, featureName: dbgp.FeatureName): Promise<dbgp.FeatureGetResponse> {
  const response = await communicator.sendCommand<dbgp.FeatureGetResponse>('feature_get', [ '-n', featureName ]);
  if (response.error) {
    throw new DbgpError(Number(response.error.attributes.code));
  }
  return response;
}
// [7.2.3 feature_set](https://xdebug.org/docs/dbgp#feature-set)
export async function sendFeatureSetCommand(communicator: SessionCommunicator, featureName: dbgp.FeatureName, value: CommandArg): Promise<dbgp.FeatureSetResponse> {
  const response = await communicator.sendCommand<dbgp.FeatureSetResponse>('feature_set', [ '-n', featureName, '-v', value ]);
  if (response.error) {
    throw new DbgpError(Number(response.error.attributes.code));
  }
  return response;
}

// [7.5 continuation commands](https://xdebug.org/docs/dbgp#continuation-commands)
export async function sendContinuationCommand(communicator: SessionCommunicator, command: dbgp.ContinuationCommandName): Promise<dbgp.ContinuationResponse> {
  const response = await communicator.sendCommand<dbgp.ContinuationResponse>(command);
  if (response.error) {
    throw new DbgpError(Number(response.error.attributes.code));
  }
  return response;
}

// [7.6.1 breakpoint_set](https://xdebug.org/docs/dbgp#id3)
export async function sendBreakpointSetCommand(communicator: SessionCommunicator, request: BreakpointSetRequest): Promise<dbgp.BreakpointSetResponse> {
  let response: dbgp.BreakpointSetResponse;
  switch (request.type) {
    case undefined:
    case 'line': response = await communicator.sendCommand('breakpoint_set', [ '-t', 'line', '-s', request.state ?? 'enabled', '-f', request.fileName, '-n', request.line ]); break;
    case 'exception': response = await communicator.sendCommand('breakpoint_set', [ '-t', 'exception', '-s', request.state ?? 'enabled', '-x', request.exceptionName ]); break;
    default: response = await communicator.sendCommand('breakpoint_set', []); break; // Receive error responses on purpose
  }
  if (response.error) {
    throw new DbgpError(Number(response.error.attributes.code));
  }
  return response;
}
// [7.6.2 breakpoint_get](https://xdebug.org/docs/dbgp#id4)
export async function sendBreakpointGetCommand(communicator: SessionCommunicator, breakpointId: number): Promise<dbgp.BreakpointGetResponse> {
  const response = await communicator.sendCommand<dbgp.BreakpointGetResponse>('breakpoint_get', [ '-d', breakpointId ]);
  if (response.error) {
    throw new DbgpError(Number(response.error.attributes.code));
  }
  return response;
}
// [7.6.4 breakpoint_remove](https://xdebug.org/docs/dbgp#id6)
export async function sendBreakpointRemoveCommand(communicator: SessionCommunicator, breakpointId: number): Promise<dbgp.BreakpointRemoveResponse> {
  const response = await communicator.sendCommand<dbgp.BreakpointRemoveResponse>('breakpoint_remove', [ '-d', breakpointId ]);
  if (response.error) {
    throw new DbgpError(Number(response.error.attributes.code));
  }
  return response;
}

// [7.8 stack_get](https://xdebug.org/docs/dbgp#stack-get)
export async function sendStackGetCommand(communicator: SessionCommunicator): Promise<dbgp.StackGetResponse> {
  const response = await communicator.sendCommand<dbgp.StackGetResponse>('stack_get');
  if (response.error) {
    throw new DbgpError(Number(response.error.attributes.code));
  }
  return response;
}

// [7.9 context_names](https://xdebug.org/docs/dbgp#context-names)
export async function sendContextNamesCommand(communicator: SessionCommunicator): Promise<dbgp.ContextNamesResponse> {
  const response = await communicator.sendCommand<dbgp.ContextNamesResponse>('context_names');
  if (response.error) {
    throw new DbgpError(Number(response.error.attributes.code));
  }
  return response;
}
// [7.10 context_get](https://xdebug.org/docs/dbgp#context-get)
export async function sendContextGetCommand(communicator: SessionCommunicator, contextIdOrName: dbgp.ContextId | dbgp.ContextName, stackLevel?: number, maxDepth?: number, maxChildren?: number): Promise<dbgp.ContextGetResponse> {
  if (typeof maxDepth === 'number') {
    await sendFeatureSetCommand(communicator, 'max_depth', maxDepth);
  }
  if (typeof maxChildren === 'number') {
    await sendFeatureSetCommand(communicator, 'max_children', maxChildren);
  }

  const contextId = typeof contextIdOrName === 'string' ? dbgp.contextIdByName[contextIdOrName] : contextIdOrName;
  const response = await communicator.sendCommand<dbgp.ContextGetResponse>('context_get', [ '-c', contextId, '-d', stackLevel ]);
  if (response.error) {
    throw new DbgpError(Number(response.error.attributes.code));
  }
  return response;
}

// [7.13 property_get](https://xdebug.org/docs/dbgp#property-get-property-set-property-value)
export async function sendPropertyGetCommand(communicator: SessionCommunicator, name: string, contextIdOrName: dbgp.ContextId | dbgp.ContextName = 0, stackLevel = 0, maxDepth?: number, maxChildren?: number, page?: number): Promise<dbgp.PropertyGetResponse> {
  const contextId = typeof contextIdOrName === 'string' ? dbgp.contextIdByName[contextIdOrName] : contextIdOrName;

  if (typeof maxDepth === 'number') {
    await sendFeatureSetCommand(communicator, 'max_depth', maxDepth);
  }
  if (typeof maxChildren === 'number') {
    await sendFeatureSetCommand(communicator, 'max_children', maxChildren);
  }
  const response = await communicator.sendCommand<dbgp.PropertyGetResponse>('property_get', [ '-c', contextId, '-n', name, '-d', stackLevel, '-p', page ]);
  if (response.error) {
    throw new DbgpError(Number(response.error.attributes.code));
  }
  return response;
}
// [7.13 property_set](https://xdebug.org/docs/dbgp#property-get-property-set-property-value)
export async function sendPropertySetCommand(communicator: SessionCommunicator, name: string, value: string | number | boolean, type?: dbgp.DataType, contextIdOrName: dbgp.ContextId | dbgp.ContextName = 0, stackLevel?: number): Promise<dbgp.PropertySetResponse> {
  const contextId = typeof contextIdOrName === 'string' ? dbgp.contextIdByName[contextIdOrName] : contextIdOrName;

  let propertyValue = String(value);
  if (typeof value === 'boolean') {
    propertyValue = value ? '1' : '0';
  }

  const response = await communicator.sendCommand<dbgp.PropertySetResponse>('property_set', [ '-c', contextId, '-n', name, '-t', type ], propertyValue);
  if (response.error) {
    throw new DbgpError(Number(response.error.attributes.code));
  }
  return response;
}

// [8.2 break](https://xdebug.org/docs/dbgp#break)
export async function sendBreakCommand(communicator: SessionCommunicator): Promise<dbgp.BreakResponse> {
  const response = await communicator.sendCommand<dbgp.BreakResponse>('break');
  if (response.error) {
    throw new DbgpError(Number(response.error.attributes.code));
  }
  return response;
}
// #endregion dbgp commands
