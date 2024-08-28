import * as validators from '../../../../tools/validator';
import { BreakpointKind } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';

export const attributeRule: AttributeRule<BreakpointKind> = validators.string().union<BreakpointKind>(
  'line',
  'exception',
  'function',
);
