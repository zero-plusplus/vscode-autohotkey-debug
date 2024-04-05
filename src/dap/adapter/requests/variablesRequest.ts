import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';

export const variablesRequest = async <R extends DebugProtocol.VariablesResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.VariablesArguments): Promise<R> => {
  const scopeOrVariable = adapter.runtime.getByVariablesReference(args.variablesReference);
  if (!scopeOrVariable) {
    return Promise.resolve(response);
  }

  const isScope = 'variables' in scopeOrVariable;
  if (isScope) {
    const scope = scopeOrVariable;
    response.body = {
      variables: scope.variables,
    };
    return Promise.resolve(response);
  }

  const variable = scopeOrVariable;
  response.body = {
    variables: [ variable ],
  };
  return Promise.resolve(response);
};
