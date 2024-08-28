import * as validators from '../../../../tools/validator';
import { BreakpointDataArray } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as breakpointData from './BreakpointData';
import * as breakpointDataGroup from './BreakpointDataGroup';

export const attributeRule: AttributeRule<BreakpointDataArray> = validators.array(validators.alternative(
  breakpointData.attributeRule,
  breakpointDataGroup.attributeRule,
));
