import * as path from 'path';
import * as dbgp from '../../types/dbgp/AutoHotkeyDebugger.types';
import { CallStack, ExecutionContextManager, Scope, StackFrame, Variable } from '../../types/dap/runtime/context.types';
import { Property, Session } from '../../types/dbgp/session.types';
import { isObjectProperty, toValueByProperty } from '../../dbgp/utils';

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
          id: context.id,
          variablesReference: variablesReference++,
          stackFrame,
          name: context.name,
          expensive: false,
          variables: createVariablesByProperties(context.id, stackFrame.id, context.properties),

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
      if (variable.evaluateName === undefined) {
        return undefined;
      }

      const stackFrame = this.getStackFrameById(variable.frameId);
      if (!stackFrame) {
        return [];
      }

      const property = await session.getProperty(variable.evaluateName, variable.scopeId, stackFrame.level);
      if (isObjectProperty(property)) {
        return createVariablesByProperties(variable.scopeId, frameId, property.children);
      }
      return [];
    },
  };

  function createVariableByProperty(scopeId: dbgp.ContextId, frameId: number, property: Property): Variable {
    const variable: Variable = {
      name: property.name,
      evaluateName: property.fullName,
      value: toValueByProperty(property),
      type: property.type,
      scopeId,
      frameId,
      variablesReference: 0,
      indexedVariables: undefined,
      namedVariables: undefined,
    };

    if (isObjectProperty(property)) {
      variable.variablesReference = variablesReference++;
      cacheByVariableReference.set(variable.variablesReference, variable);
    }
    return variable;
  }
  function createVariablesByProperties(scopeId: dbgp.ContextId, frameId: number, properties: Property[]): Variable[] {
    return properties.map((property) => {
      return createVariableByProperty(scopeId, frameId, property);
    });
  }
};
