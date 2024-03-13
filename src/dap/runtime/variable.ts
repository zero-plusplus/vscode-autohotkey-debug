import { Scope, Variable, VariableManager } from '../../types/dap/runtime/variable.types';
import { Session } from '../../types/dbgp/session.types';

const firstVariableId = 1;
export const createVariableManager = (session: Session): VariableManager => {
  let variablesId = firstVariableId;
  const scopeById = new Map<number, Scope>();
  const variableById = new Map<number, Variable>();

  return {
    resetVariableReference(): void {
      variablesId = firstVariableId;
    },
    async getScopes(stackFrameLevel: number): Promise<Scope[]> {
      return (await session.getContexts(stackFrameLevel)).map((context) => {
        const scope: Scope = {
          id: variablesId++,
          name: context.name,
          variables: context.properties.map((property) => {
            const variable: Variable = {
              id: variablesId++,
              ...property,
            };

            variableById.set(variable.id, variable);
            return variable;
          }),
        };
        scopeById.set(scope.id, scope);
        return scope;
      });
    },
    getScopeById(id: number): Scope | undefined {
      return scopeById.get(id);
    },
    getVariableById(id: number): Variable | undefined {
      return variableById.get(id);
    },
  };
};
