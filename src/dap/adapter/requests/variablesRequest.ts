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
    return response;
  }


  const end = (typeof args.start === 'number' && typeof args.count === 'number') ? args.start + args.count : undefined;
  const childrens = await adapter.runtime.fetchVariableChildren(args.variablesReference, args.start ?? 0, end);
  if (childrens) {
    response.body = {
      variables: childrens,
    };
    return response;
  }

  const variable = scopeOrVariable;
  response.body = {
    variables: [ variable ],
  };
  return response;
};
