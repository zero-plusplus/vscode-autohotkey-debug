import * as path from 'path';
import * as dbgp from '../../types/dbgp/AutoHotkeyDebugger.types';
import { CallStack, ExecutionContextManager, Scope, StackFrame, Variable } from '../../types/dap/runtime/context.types';
import { Property, Session } from '../../types/dbgp/session.types';
import { isObjectProperty, toValueByProperty } from '../../dbgp/utils';
import { range } from '../../tools/utils';

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
      const contexts = await session.getContexts(stackFrame.level);

      const scopes: Scope[] = [];
      for await (const context of contexts) {
        const scope: Scope = {
          id: context.id,
          variablesReference: variablesReference++,
          stackFrame,
          name: context.name,
          expensive: false,
          variables: await createVariablesByProperties(context.id, stackFrame.id, context.properties),

          // source
          source: undefined,
          line: 0,
          column: 0,
          endLine: 0,
          endColumn: 0,
        };

        cacheByVariableReference.set(scope.variablesReference, scope);
        scopes.push(scope);
      }
      return scopes;
    },
    async fetchVariableChildren(variablesReference: number, maxChildren?: number): Promise<Variable[] | undefined> {
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
        const children = await session.getPropertyChildren(property, maxChildren, 0);
        return createVariablesByProperties(variable.scopeId, stackFrame.id, children);
      }
      return [];
    },
    async fetchArrayIndexes(variablesReference: number, start?: number, end?: number): Promise<Variable[] | undefined> {
      const variable = this.getByVariablesReference(variablesReference);
      if (!variable) {
        return undefined;
      }

      const isScope = 'variables' in variable;
      if (isScope) {
        return undefined;
      }
      if (!variable.evaluateName) {
        return undefined;
      }
      if (!variable.indexedVariables) {
        return undefined;
      }

      const stackFrame = this.getStackFrameById(variable.frameId);
      if (!stackFrame) {
        return [];
      }
      const property = await session.getProperty(variable.evaluateName, variable.scopeId, stackFrame.level);
      if (property.type !== 'object') {
        return undefined;
      }

      const children: Property[] = [];
      for await (const i_0base of range(start ?? 0, end ?? variable.indexedVariables, true)) {
        const index_1base = i_0base + 1;
        const query = `${property.fullName}[${index_1base}]`;

        const child = await session.getProperty(query, variable.scopeId, stackFrame.level);
        if (child.type === 'undefined') {
          break;
        }
        child.name = `[${index_1base}]`;
        children.push(child);
      }
      return createVariablesByProperties(variable.scopeId, variable.frameId, children);
    },
  };


  async function createVariableByProperty(scopeId: dbgp.ContextId, frameId: number, property: Property): Promise<Variable> {
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

    if (!isObjectProperty(property)) {
      return variable;
    }

    variable.variablesReference = variablesReference++;
    cacheByVariableReference.set(variable.variablesReference, variable);

    const length = await session.getArrayLengthByProperty(property);
    if (length && 100 < length) {
      variable.indexedVariables = length;
      return variable;
    }
    return variable;
  }
  async function createVariablesByProperties(scopeId: dbgp.ContextId, frameId: number, properties: Property[]): Promise<Variable[]> {
    const variables: Variable[] = [];
    for await (const property of properties) {
      const variable = await createVariableByProperty(scopeId, frameId, property);
      variables.push(variable);
    }
    return variables;
  }
};
