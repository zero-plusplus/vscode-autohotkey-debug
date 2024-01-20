import { Socket } from 'net';
import { createCommandSender } from './sender';
import { CommandSession } from '../../../../types/dap/session';

export const createCommandSession = (socket: Socket): CommandSession => {
  const sendCommand = createCommandSender(socket);
  return {
    sendBreakCommand: () => sendCommand()
  }
};
