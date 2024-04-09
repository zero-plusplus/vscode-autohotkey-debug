import * as dbgp from '../../dbgp/AutoHotkeyDebugger.types';
import { Property } from '../../dbgp/session.types';
import { SyntaxKind } from '../autohotkey/parser/common.types';

export type EvalFunc<Result> = (node: Node) => Result;
export type EvaluatedValue =
  | PrimitiveValue
  | Property
  | undefined;

export type PrimitiveValue =
  | UnsetValue
  | StringValue
  | NumberValue
  | BooleanValue;

export interface PrimitiveValueBase {
  kind: SyntaxKind;
  type: dbgp.PrimitiveDataType;
  text: string;
}
export interface UnsetValue {
  kind: SyntaxKind.UnsetKeyword;
  type: 'undefined';
}
export interface StringValue extends PrimitiveValueBase {
  kind: SyntaxKind.StringLiteral;
  type: 'string';
  value: string;
}
export interface NumberValue extends PrimitiveValueBase {
  kind: SyntaxKind.NumberLiteral;
  type: 'integer' | 'float';
  value: number;
}
export interface BooleanValue extends PrimitiveValueBase {
  kind: SyntaxKind.BooleanLiteral;
  type: 'string';
  value: '1' | '0';
  bool: boolean;
}

export interface AELLEvaluator {
  eval: (input: string) => Promise<EvaluatedValue>;
}
