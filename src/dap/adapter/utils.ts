import { DapScope, DapStackFrame, DapVariable } from '../../types/dap/types';
import { FrameIdManager, VariablesReferenceManager } from '../../types/dap/adapter/utils.types';

export function createVariablesReferenceManager(): VariablesReferenceManager {
  const firstVariablesReference = 1;
  let currentVariablesReference = firstVariablesReference;
  const scopeOrVariableByVariableReference = new Map<number, DapScope | DapVariable>();

  const manager: VariablesReferenceManager = {
    createVariablesReference: (): number => {
      return currentVariablesReference++;
    },
    set: <T extends DapScope | DapVariable>(scopeOrVariable: T): T => {
      scopeOrVariableByVariableReference.set(scopeOrVariable.variablesReference, scopeOrVariable);
      return scopeOrVariable;
    },
    setAll: <T extends DapScope[] | DapVariable[]>(scopesOrVariables: T): T => {
      for (const scopeOrVariable of scopesOrVariables) {
        manager.set(scopeOrVariable);
      }
      return scopesOrVariables;
    },
    get: (variableReference: number): DapScope | DapVariable | undefined => {
      return scopeOrVariableByVariableReference.get(variableReference);
    },
    reset: (): void => {
      currentVariablesReference = firstVariablesReference;
      scopeOrVariableByVariableReference.clear();
    },
  };
  return manager;
}
export function createFrameIdManager(): FrameIdManager {
  const firstFrameId = 1;
  let currentFrameId = firstFrameId;
  const frameInfoByFrameId = new Map<number, DapStackFrame>();

  const manager: FrameIdManager = {
    createFrameId: (): number => {
      return currentFrameId++;
    },
    set: <T extends DapStackFrame>(stackFrame: T): T => {
      frameInfoByFrameId.set(stackFrame.id, stackFrame);
      return stackFrame;
    },
    setAll: <T extends DapStackFrame[]>(stackFrames: T): T => {
      for (const stackFrame of stackFrames) {
        manager.set(stackFrame);
      }
      return stackFrames;
    },
    get: (frameId: number): DapStackFrame | undefined => {
      const frameInfo = frameInfoByFrameId.get(frameId);
      if (frameInfo === undefined) {
        return undefined;
      }
      return frameInfo;
    },
    reset: (): void => {
      currentFrameId = firstFrameId;
      frameInfoByFrameId.clear();
    },
  };
  return manager;
}

