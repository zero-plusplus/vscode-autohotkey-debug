import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';
import { contextsToScopes } from '../../converter/scope';

export const scopesRequest = async <R extends DebugProtocol.ScopesResponse>(adapter: AutoHotkeyDebugAdapter, response: R, { frameId }: DebugProtocol.ScopesArguments): Promise<R> => {
  const stackFrame = adapter.framdIdManager.get(frameId);
  if (!stackFrame) {
    throw Error('');
  }

  const contexts = await adapter.runtime.getContexts(stackFrame.level, 0, 0);
  const scopes = contextsToScopes(adapter.variablesReferenceManager, contexts);
  adapter.variablesReferenceManager.setAll(scopes);

  response.body = {
    scopes,
  };
  return response;
};
