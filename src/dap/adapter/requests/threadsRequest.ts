import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';
import { Thread } from '@vscode/debugadapter';

export const threadsRequest = async <R extends DebugProtocol.ThreadsResponse>(adapter: AutoHotkeyDebugAdapter, response: R): Promise<R> => {
  const threadId = adapter.runtime.threadId;
  response.body = { threads: [ new Thread(threadId, `Thread ${threadId}`) ] };
  return Promise.resolve(response);
};
