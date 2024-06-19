import { DapScope, DapStackFrame, DapVariable } from '../types';

export interface VariablesReferenceManager {
  createVariablesReference: () => number;
  set: <T extends DapScope | DapVariable>(scopeOrVariable: T) => T;
  setAll: <T extends DapScope[] | DapVariable[]>(scopesOrVariables: T) => T;
  get: (variableReference: number) => DapScope | DapVariable | undefined;
  reset: () => void;
}

export interface FrameIdManager {
  createFrameId: () => number;
  set: <T extends DapStackFrame>(stackFrame: T) => T;
  setAll: <T extends DapStackFrame[]>(stackFrames: T) => T;
  get: (frameId: number) => DapStackFrame | undefined;
  reset: () => void;
}
