import { DebugProtocol } from '@vscode/debugprotocol';
import * as dbgp from '../../dbgp/AutoHotkeyDebugger.types';

export type CallStack = StackFrame[];
export interface StackFrame extends DebugProtocol.StackFrame {
  id: number;
  type: dbgp.StackType;
  label: string;
  level: number;
  fileName: string;
  line: number;
}
export interface Scope extends DebugProtocol.Scope {
  id: dbgp.ContextId;
  stackFrame: StackFrame;
  variables: Variable[];
}
export interface Variable extends DebugProtocol.Variable {
  scopeId: Scope['id'];
  frameId: StackFrame['id'];
}

export interface ExecutionContextManager {
  resetVariableReference: () => void;
  getStackFrameById: (frameId: number) => StackFrame | undefined;
  getByVariablesReference: (variablesReference: number) => Scope | Variable | undefined;
  fetchCallStack: () => Promise<CallStack>;
  fetchScopes: (frameId: number) => Promise<Scope[]>;
  fetchVariableChildren: (variablesReference: number) => Promise<Variable[] | undefined> ;
}
