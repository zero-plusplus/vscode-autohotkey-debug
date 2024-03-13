import { DebugProtocol } from '@vscode/debugprotocol';
import { AutoHotkeyDebugAdapter } from '../adapter';
import { ObjectVariable, PrimitiveVariable, Variable } from '../../../types/dap/runtime/variable.types';

export const variablesRequest = async <R extends DebugProtocol.VariablesResponse>(adapter: AutoHotkeyDebugAdapter, response: R, args: DebugProtocol.VariablesArguments): Promise<R> => {
  const variables = adapter.runtime.getScopeById(args.variablesReference)?.variables;
  if (variables) {
    response.body = {
      variables: toVariables(variables),
    };
    return Promise.resolve(response);
  }

  const variable = adapter.runtime.getVariableById(args.variablesReference);
  if (variable) {
    response.body = {
      variables: [ toVariable(variable) ],
    };
  }
  return Promise.resolve(response);

  function toVariables(rawVariables: Variable[]): DebugProtocol.Variable[] {
    return rawVariables.map((rawVariable) => {
      return toVariable(rawVariable);
    });
  }
  function toVariable(rawVariable: Variable): DebugProtocol.Variable {
    if (rawVariable.type === 'object') {
      return toObjectVariable(rawVariable);
    }
    return toPrimitiveVariable(rawVariable);
  }
  function toPrimitiveVariable(rawVariable: PrimitiveVariable): DebugProtocol.Variable {
    return {
      variablesReference: rawVariable.id,
      name: rawVariable.name,
      value: rawVariable.value,
      type: rawVariable.type,
    };
  }
  function toObjectVariable(rawVariable: ObjectVariable): DebugProtocol.Variable {
    return {
      variablesReference: rawVariable.id,
      name: rawVariable.name,
      value: rawVariable.className,
      type: rawVariable.type,
    };
  }
};
