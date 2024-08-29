import * as validators from '../../../../tools/validator';
import { BreakpointDataArray } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';
import { breakpointDataRule } from './BreakpointData';
import { breakpointDataGroupRule } from './BreakpointDataGroup';

export const breakpointDataArrayRule: AttributeRule<BreakpointDataArray> = validators.array(validators.alternative(
  breakpointDataRule,
  breakpointDataGroupRule,
));
