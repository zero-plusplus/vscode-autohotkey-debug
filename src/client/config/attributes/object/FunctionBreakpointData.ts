import * as validators from '../../../../tools/validator';
import { FunctionBreakpointData } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';
import { namedBreakpointDataBaseRuleMap } from './NamedBreakpointDataBase';

export const functionBreakpointDataRule: AttributeRule<FunctionBreakpointData> = validators.object<FunctionBreakpointData>({
  ...namedBreakpointDataBaseRuleMap,
  kind: validators.literalUnion('function'),
});
