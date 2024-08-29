import * as validators from '../../../../tools/validator';
import { BreakpointKind } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';

export const breakpointKindRule: AttributeRule<BreakpointKind> = validators.string().union<BreakpointKind>(
  'line',
  'exception',
  'function',
);
