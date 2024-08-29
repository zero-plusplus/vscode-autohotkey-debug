import * as validators from '../../../../tools/validator';
import { ExceptionBreakpointData } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as namedBreakpointDataBase from './NamedBreakpointDataBase';

export const exceptionBreakpointDataRule: AttributeRule<ExceptionBreakpointData> = validators.object<ExceptionBreakpointData>({
  ...namedBreakpointDataBase.namedBreakpointDataBaseRuleMap,
  kind: validators.literalUnion('exception'),
});
