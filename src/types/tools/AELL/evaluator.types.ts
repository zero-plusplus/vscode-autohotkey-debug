import { Property, PseudoPrimitiveProperty } from '../../dbgp/session.types';

export type EvalFunc<Result> = (node: Node) => Result;
export type EvaluatedValue = Property | PseudoPrimitiveProperty;

export interface AELLEvaluator {
  eval: (input: string) => Promise<EvaluatedValue>;
}
