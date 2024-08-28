import * as validators from '../../../../tools/validator';
import { LogpointData } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as lineBreakpointDataBase from './LineBreakpointDataBase';

export const attributeRule: AttributeRule<LogpointData> = validators.object<LogpointData>({
  ...lineBreakpointDataBase.attributeRuleMap,
  kind: validators.literalUnion('log'),
});
