import * as validators from '../../../../tools/validator';
import { BreakpointData } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as lineBreakpointData from './LineBreakpointData';
import * as logpointData from './LogpointData';
import * as returnBreakpointData from './ReturnBreakpointData';
import * as functionBreakpointData from './FunctionBreakpointData';
import * as exceptionBreakpointData from './ExceptionBreakpointData';

export const attributeRule: AttributeRule<BreakpointData> = validators.alternative<BreakpointData>(
  lineBreakpointData.attributeRule,
  logpointData.attributeRule,
  functionBreakpointData.attributeRule,
  returnBreakpointData.attributeRule,
  exceptionBreakpointData.attributeRule,
);
