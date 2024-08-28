import * as validators from '../../../../tools/validator';
import { BreakpointDataGroup } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as breakpointData from './BreakpointData';

export const attributeRule: AttributeRule<BreakpointDataGroup> = validators.object<BreakpointDataGroup>({
  label: validators.string(),
  breakpoints: validators.array(breakpointData.attributeRule),
});
