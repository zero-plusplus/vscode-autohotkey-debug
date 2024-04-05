import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const scopesRequest = async <R extends DebugProtocol.ScopesResponse>(adapter: AutoHotkeyDebugAdapter, response: R, { frameId }: DebugProtocol.ScopesArguments): Promise<R> => {
  const stackFrame = adapter.runtime.getStackFrameById(frameId);
  if (!stackFrame) {
    throw Error('');
  }

  const scopes = await adapter.runtime.fetchScopes(stackFrame.id);
  response.body = {
    scopes,
  };
  return response;
};
