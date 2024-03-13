import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';
import { Scope } from '../../../types/dap/runtime/variable.types';

export const scopesRequest = async <R extends DebugProtocol.ScopesResponse>(adapter: AutoHotkeyDebugAdapter, response: R, { frameId }: DebugProtocol.ScopesArguments): Promise<R> => {
  const stackFrame = adapter.runtime.getStackFrameById(frameId);
  if (!stackFrame) {
    throw Error('');
  }

  const scopes = await adapter.runtime.getScopes(stackFrame.level);
  response.body = {
    scopes: toDapScopes(scopes),
  };
  return response;

  function toDapScopes(scopes: Scope[]): DebugProtocol.Scope[] {
    return scopes.map((scope) => toDapScope(scope));
  }
  function toDapScope(scope: Scope): DebugProtocol.Scope {
    return {
      variablesReference: scope.id,
      name: scope.name,
      source: {
        path: stackFrame?.fileName,
      },
      expensive: false,
    };
  }
};
