import * as validators from '../../../../tools/validator';
import { LineBreakpointData } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as lineBreakpointDataBase from './LineBreakpointDataBase';

export const attributeRule: AttributeRule<LineBreakpointData> = validators.object<LineBreakpointData>({
  ...lineBreakpointDataBase.attributeRuleMap,
  kind: validators.literalUnion('line'),
}).normalizeProperties({
  kind: {
    undefined: () => {
      return 'line';
    },
  },
});
