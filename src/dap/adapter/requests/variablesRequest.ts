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

  const parentVariable = scopeOrVariable;
  if (parentVariable.indexedVariables && typeof args.start === 'number' && typeof args.count === 'number') {
    const start_1base = args.start + 1;
    const end_1base = start_1base + 100;
    const children = await adapter.runtime.fetchArrayElements(args.variablesReference, start_1base, end_1base);
    if (children) {
      response.body = {
        variables: children,
      };
    }
    return response;
  }

  const children = await adapter.runtime.fetchVariableChildren(args.variablesReference);
  if (children) {
    response.body = {
      variables: children,
    };
  }

  return response;
};
