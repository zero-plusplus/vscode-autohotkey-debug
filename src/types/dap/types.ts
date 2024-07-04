import * as dbgp from '../dbgp/AutoHotkeyDebugger.types';
import { DebugProtocol } from '@vscode/debugprotocol';
import { Property, PseudoProperty } from '../tools/autohotkey/runtime/context.types';

export type DapCallStack = DapStackFrame[];
export interface DapStackFrame extends DebugProtocol.StackFrame {
  level: number;
}
export interface DapScope extends DebugProtocol.Scope {
  contextId: dbgp.ContextId;
  stackLevel: number;
}
export interface DapVariable extends DebugProtocol.Variable {
  contextId: Property['contextId'] | PseudoProperty['contextId'];
  stackLevel: number;
  pagingKind: 'none' | 'array' | 'map' | 'all';
  enumerableCount?: number;
  nonEnumerableCount?: number;
  numberOfChildren?: number;
}

