import { DebugProtocol } from '@vscode/debugprotocol';

export enum ScopeId {
  Local = 0,
  Global = 1,
  Static = 2,
}
export type ScopeName = 'Local' | 'Global' | 'Static';
export interface Scope extends DebugProtocol.Scope {
  id: ScopeId;
  name: ScopeName;
}
