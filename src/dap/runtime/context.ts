import * as path from 'path';
import { CallStack, ExecutionContextManager, Scope, StackFrame, Variable } from '../../types/dap/runtime/context.types';
import { Session } from '../../types/dbgp/session.types';

const firstFrameId = 1;
const firstVariableReference = 1;
export const createExecutionContextManager = (session: Session): ExecutionContextManager => {
  let frameId = firstFrameId;
  let variablesReference = firstVariableReference;

  const callStackById = new Map<number, StackFrame>();
  const cacheByVariableReference = new Map<number, Scope | Variable>();
  return {
    resetVariableReference(): void {
      variablesReference = firstVariableReference;
    },
    getStackFrameById(frameId: number): StackFrame | undefined {
      return callStackById.get(frameId);
    },
    getByVariablesReference(variablesReference: number): Scope | Variable | undefined {
      return cacheByVariableReference.get(variablesReference);
    },
    async fetchCallStack(): Promise<CallStack> {
      return (await session.getCallStack()).map((rawStackFrame) => {
        const stackFrame: StackFrame = {
          id: frameId++,
          type: 'file',
          name: rawStackFrame.where,
          label: rawStackFrame.where,
          level: rawStackFrame.level,

          // source
          fileName: rawStackFrame.fileName,
          source: {
            name: path.basename(rawStackFrame.fileName, path.extname(rawStackFrame.fileName)),
            path: rawStackFrame.fileName,
          },
          line: rawStackFrame.line,
          column: 0,
          endLine: undefined,
          endColumn: undefined,
        };

        callStackById.set(stackFrame.id, stackFrame);
        return stackFrame;
      });
    },
    async fetchScopes(frameId: number): Promise<Scope[]> {
      const stackFrame = callStackById.get(frameId);
      if (!stackFrame) {
        return [];
      }
      return (await session.getContexts(stackFrame.level)).map((context) => {
        const scope: Scope = {
          variablesReference: variablesReference++,
          stackFrame,
          name: context.name,
          expensive: false,
          variables: context.properties.map((property) => {
            const variable: Variable = {
              name: property.name,
              evaluateName: property.fullName,
              value: '',
              type: property.type,
              scope,
              variablesReference: variablesReference++,
              indexedVariables: undefined,
              namedVariables: undefined,
            };

            cacheByVariableReference.set(scope.variablesReference, scope);
            return variable;
          }),

          // source
          source: undefined,
          line: 0,
          column: 0,
          endLine: 0,
          endColumn: 0,
        };

        cacheByVariableReference.set(scope.variablesReference, scope);
        return scope;
      });
    },
    async fetchVariableChildren(variablesReference: number): Promise<Variable[] | undefined> {
      const variableOrScope = this.getByVariablesReference(variablesReference);
      if (!variableOrScope) {
        return undefined;
      }
      if (variableOrScope.variablesReference === 0) {
        return undefined;
      }

      const isScope = 'variables' in variableOrScope;
      if (isScope) {
        const scope = variableOrScope;
        return scope.variables;
      }

      const variable = variableOrScope;
      variable;
      return Promise.resolve([]);
    },
  };
};
