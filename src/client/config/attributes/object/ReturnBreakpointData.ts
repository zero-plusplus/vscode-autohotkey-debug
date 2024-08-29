import * as validators from '../../../../tools/validator';
import { ReturnBreakpointData } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';
import { namedBreakpointDataBaseRuleMap } from './NamedBreakpointDataBase';

export const returnBreakpointDataRule: AttributeRule<ReturnBreakpointData> = validators.object<ReturnBreakpointData>({
  ...namedBreakpointDataBaseRuleMap,
  kind: validators.literalUnion('return'),
});
