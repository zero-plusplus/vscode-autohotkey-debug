import { PropertyLike } from '../../dap/runtime/context.types';

export type EvalFunc<Result> = (node: Node) => Result;
export interface AELLEvaluator {
  eval: (input: string) => Promise<PropertyLike>;
}
