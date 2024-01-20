/* eslint-disable func-style, @typescript-eslint/no-use-before-define */
import { MessageHandlers, Session } from '../../../types/dbgp/AutoHotkeyDebugger';
import { createCommandSession } from './commands';
import { createCommandSender } from './commands/sender';
import { messageEventName } from './constant';
import { createDebugServer } from './server';

export const createDebugSession = async(messageHandlers: MessageHandlers): Promise<Pick<Session, 'init'>> => {
  const [ server, socket ] = await createDebugServer();
  const commandSession = createCommandSession(socket);

  return {
    async init(port, hostname): Promise<void> {
      return new Promise((resolve) => {
        server
          .listen(port, hostname)
          .on('connection', (socket) => {
            socket.on(messageEventName, () => {
              resolve();
            });
          });
      });
    },
  };

  // #region utils

  // function onMessage(packet: Packet): void {
  //   if ('init' in packet) {
  //     messageHandlers.init(packet.init);
  //     return;
  //   }
  //   if ('stream' in packet) {
  //     messageHandlers.stream(packet.stream);
  //   }
  // }
  //   await createDebugServer({
  //     init: (socket) => {
  //       Promise.all([
  //         session.sendFeatureSetCommand('max_depth', DEFAULT_MAX_DEPTH),
  //         session.sendStdoutCommand('redirect'),
  //         session.sendStderrCommand('redirect'),
  //
  //         session.sendPropertySetCommand('A_DebuggerName', 1, 'Visual Studio Code'),
  //         session.sendFeatureGetCommand('language_version').then((response) => {
  //           this._ahkVersion = new AhkVersion(response.value);
  //         }),
  //       ]).then(() => {
  //         this.emit('init', initPacket);
  //       });
  //     },
  //     stream: () => {
  //
  //     },
  //   });

  socket.on('data', handlePacket);

  const session: Session = {
    sendStatusCommand: async() => sendCommand('status'),
  };
  return session;
  function countTransactionId(): number {
    return transactionId++;
  }
  // #endregion utils
};
