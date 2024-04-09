import { Property } from '../../dbgp/session.types';

export type EvalFunc<Result> = (node: Node) => Result;
export type EvaluatedValue = Property | undefined;

export interface AELLEvaluator {
  eval: (input: string) => Promise<EvaluatedValue>;
}
