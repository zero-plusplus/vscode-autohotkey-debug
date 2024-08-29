import * as validators from '../../../../tools/validator';
import { LogpointData } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';
import { lineBreakpointDataBaseRuleMap } from './LineBreakpointDataBase';

export const logpointDataRule: AttributeRule<LogpointData> = validators.object<LogpointData>({
  ...lineBreakpointDataBaseRuleMap,
  kind: validators.literalUnion('log'),
});
