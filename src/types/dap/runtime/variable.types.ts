import * as dbgp from '../../dbgp/AutoHotkeyDebugger.types';
import { ObjectProperty, PrimitiveProperty } from '../../dbgp/session.types';

export interface Scope {
  id: number;
  name: dbgp.ContextName;
  variables: Variable[];
}
export type Variable = PrimitiveVariable | ObjectVariable;
export interface PrimitiveVariable extends PrimitiveProperty {
  id: number;
}
export interface ObjectVariable extends ObjectProperty {
  id: number;
}

export interface VariableManager {
  resetVariableReference: () => void;
  getScopes: (stackFrameLevel: number) => Promise<Scope[]>;
  getScopeById: (id: number) => Scope | undefined;
  getVariableById: (id: number) => Variable | undefined;
}
