import { Expression } from '../../autohotkey/parser/common.types';

export interface NodeTransformer {
  transform: (node: Expression) => Expression;
}
