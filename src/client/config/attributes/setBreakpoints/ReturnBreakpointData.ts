import * as validators from '../../../../tools/validator';
import { ReturnBreakpointData } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as namedBreakpointDataBase from './NamedBreakpointDataBase';

export const attributeRule: AttributeRule<ReturnBreakpointData> = validators.object<ReturnBreakpointData>({
  ...namedBreakpointDataBase.attributeRuleMap,
  kind: validators.literalUnion('return'),
});
