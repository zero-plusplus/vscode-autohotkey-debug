import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';
import { createIndexedVariablesByVariable, createNamedVariablesByVariable, createVariablesByScope, createVariablesByVariable } from '../../converter/variable';
import { DapVariable } from '../../../types/dap/types';

const chunkSize = 100;
export const variablesRequest = async <R extends DebugProtocol.VariablesResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.VariablesArguments): Promise<R> => {
  const scopeOrVariable = adapter.variablesReferenceManager.get(args.variablesReference);
  if (!scopeOrVariable) {
    return Promise.resolve(response);
  }
  const isScope = !('value' in scopeOrVariable);
  if (isScope) {
    const scope = scopeOrVariable;
    const variables = await createVariablesByScope(adapter.runtime.session, adapter.variablesReferenceManager, scope, adapter.config.maxChildren);
    return setResponse(variables);
  }

  const parentVariable = scopeOrVariable;
  if (!parentVariable.evaluateName) {
    return response;
  }

  if (args.start === undefined) {
    if (args.filter === 'named') {
      const variables = await createNamedVariablesByVariable(adapter.runtime.session, adapter.variablesReferenceManager, parentVariable, adapter.config.maxChildren);
      return setResponse(variables);
    }

    const variables = await createVariablesByVariable(adapter.runtime.session, adapter.variablesReferenceManager, parentVariable, adapter.config.maxChildren);
    return setResponse(variables);
  }

  const page = typeof args.start === 'number' ? args.start / chunkSize : undefined;
  if (args.filter === 'indexed') {
    const variables = await createIndexedVariablesByVariable(adapter.runtime.session, adapter.variablesReferenceManager, parentVariable, chunkSize, page);
    return setResponse(variables);
  }

  const variables = await createVariablesByVariable(adapter.runtime.session, adapter.variablesReferenceManager, parentVariable, adapter.config.maxChildren, page);
  return setResponse(variables);

  function setResponse(variables: DapVariable[]): R {
    adapter.variablesReferenceManager.setAll(variables);
    response.body = {
      variables,
    };
    return response;
  }
};

