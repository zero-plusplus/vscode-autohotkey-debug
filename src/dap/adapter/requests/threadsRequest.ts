import { DebugProtocol } from '@vscode/debugprotocol';

export const threadsRequest = <R extends DebugProtocol.ThreadsResponse>(response: R): R => {
  return response;
};
