import * as dbgp from '../../dbgp/AutoHotkeyDebugger.types';
import { CommandArg } from '../../dbgp/session.types';

// #region context
export interface StackFrame {
  fileName: string;
  level: number;
  line: number;
  type: dbgp.StackType;
  where: string;
}
export interface ContextIdentifier {
  id: dbgp.ContextId;
  name: dbgp.ContextName;
}
export interface Context extends ContextIdentifier {
  stackFrameLevel: number;
  properties: Property[];
}
// #endregion context

// #region property
export type Property = PrimitiveProperty | ObjectProperty;
export interface PropertyBase {
  contextId: dbgp.ContextId;
  stackLevel: number;
  name: string;
  fullName: string;
  size: number;
  type: dbgp.DataType;
}
export interface PseudoPropertyBase {
  contextId: -1;
  stackLevel: 0;
  name: string;
  fullName: string;
  size: number;
  type: dbgp.DataType;
}
export interface UnsetProperty extends PropertyBase {
  type: dbgp.UnsetDataType;
  value: '';
}
export interface PrimitiveProperty extends PropertyBase {
  type: dbgp.PrimitiveDataType;
  constant: boolean;
  value: string;
}
export interface ObjectProperty extends PropertyBase {
  type: dbgp.ObjectDataType;
  className: string;
  facet: dbgp.PropertyFacet;
  hasChildren: boolean;
  numberOfChildren: number | undefined;
  address: number;
  children?: Property[];
  page: number;
  pageSize: number;
}
export interface MapLikeProperty extends ObjectProperty {
  count: number;
}
export interface ArrayLikeProperty extends ObjectProperty {
  keys: number;
  length: number;
}
export type PseudoProperty = PseudoPrimitiveProperty;
export interface PseudoPrimitiveProperty extends PseudoPropertyBase {
  type: dbgp.PrimitiveDataType;
  constant: undefined;
  value: string;
}
// #endregion property

export interface ExecutionContextManager {
  getFeature: (featureName: dbgp.FeatureName) => Promise<string>;
  getMaxChildren: () => Promise<number>;
  getMaxDepth: () => Promise<number>;
  setFeature: (featureName: dbgp.FeatureName, value: CommandArg) => Promise<boolean>;
  setMaxChildren: (maxChildren: number) => Promise<boolean>;
  setMaxDepth: (depth: number) => Promise<boolean>;
  getCallStack: () => Promise<StackFrame[]>;
  getStackFrame: (level: number) => Promise<StackFrame | undefined>;
  getContextIdentifiers: () => Promise<ContextIdentifier[]>;
  getContexts: (stackFrameLevel?: number, maxDepth?: number, maxChildren?: number) => Promise<Context[]>;
  getProperty: (name: string, contextIdOrName: dbgp.ContextId | dbgp.ContextName, stackLevel?: number, maxDepth?: number, maxChildren?: number, page?: number) => Promise<Property | undefined>;
  setProperty: (name: string, value: string | number | boolean, type?: dbgp.DataType, contextIdOrName?: dbgp.ContextId | dbgp.ContextName, stackLevel?: number) => Promise<Property>;
}
