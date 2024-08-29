import * as validators from '../../../../tools/validator';
import { LineBreakpointData } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';
import { lineBreakpointDataBaseRuleMap } from './LineBreakpointDataBase';

export const lineBreakpointDataRule: AttributeRule<LineBreakpointData> = validators.object<LineBreakpointData>({
  ...lineBreakpointDataBaseRuleMap,
  kind: validators.literalUnion('line'),
}).normalizeProperties({
  kind: {
    undefined: () => {
      return 'line';
    },
  },
});
