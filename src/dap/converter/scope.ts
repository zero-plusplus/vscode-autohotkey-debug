import { VariablesReferenceManager } from '../../types/dap/adapter/utils.types';
import { Context } from '../../types/dap/runtime/context.types';
import { DapScope } from '../../types/dap/types';

export function contextsToScopes(variablesReferenceManager: VariablesReferenceManager, contexts: Context[]): DapScope[] {
  return contexts.map((context) => contextToScope(variablesReferenceManager, context));
}
export function contextToScope(variablesReferenceManager: VariablesReferenceManager, context: Context): DapScope {
  const dapScope: DapScope = {
    variablesReference: variablesReferenceManager.createVariablesReference(),
    stackLevel: context.stackFrameLevel,
    contextId: context.id,
    name: context.name,
    expensive: false,
  };
  return dapScope;
}
