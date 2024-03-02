import { Node } from './common.types';

export type EvalFunc<Result> = (node: Node) => Result;
