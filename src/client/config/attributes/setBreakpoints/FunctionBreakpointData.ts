import * as validators from '../../../../tools/validator';
import { FunctionBreakpointData } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as namedBreakpointDataBase from './NamedBreakpointDataBase';

export const attributeRule: AttributeRule<FunctionBreakpointData> = validators.object<FunctionBreakpointData>({
  ...namedBreakpointDataBase.attributeRuleMap,
  kind: validators.literalUnion('function'),
});
