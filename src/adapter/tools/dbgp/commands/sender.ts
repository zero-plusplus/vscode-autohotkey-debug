import { Socket } from 'net';
import { CommandResponse } from '../../../../types/dbgp/ExtendAutoHotkeyDebugger';
import { messageEventName } from '../constant';
import { CommandSender } from '../../../../types/dap/session';

export const createCommandSender = <R extends CommandResponse>(socket: Socket): CommandSender<R> => {
  let transactionId = 0;
  return async(commandName, args, data): Promise<R> => {
    return new Promise((resolve, reject) => {
      transactionId++;

      let command_str = `${commandName} -i ${String(transactionId)}`;
      if (typeof args !== 'undefined') {
        command_str += ` ${args}`;
      }
      if (typeof data !== 'undefined') {
        command_str += ` -- ${Buffer.from(data).toString('base64')}`;
      }
      command_str += '\0';

      if (!socket.writable) {
        Promise.reject(new Error('Socket not writable.'));
        return;
      }

      socket.write(Buffer.from(command_str), (err) => {
        if (err) {
          reject(new Error('Some error occurred when writing'));
        }
        socket.on(messageEventName, (packet: Response) => {
          if ('responce' in packet) {
            resolve(packet as R);
          }
        });
      });
    });
  };
};
