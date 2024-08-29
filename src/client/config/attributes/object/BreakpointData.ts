import * as validators from '../../../../tools/validator';
import { BreakpointData } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';
import { lineBreakpointDataRule } from './LineBreakpointData';
import { logpointDataRule } from './LogpointData';
import { returnBreakpointDataRule } from './ReturnBreakpointData';
import { functionBreakpointDataRule } from './FunctionBreakpointData';
import { exceptionBreakpointDataRule } from './ExceptionBreakpointData';

export const breakpointDataRule: AttributeRule<BreakpointData> = validators.alternative<BreakpointData>(
  lineBreakpointDataRule,
  logpointDataRule,
  functionBreakpointDataRule,
  returnBreakpointDataRule,
  exceptionBreakpointDataRule,
);
