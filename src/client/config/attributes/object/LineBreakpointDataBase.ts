import * as validators from '../../../../tools/validator';
import { LineBreakpointDataBase } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { InterfaceToRuleMap } from '../../../../types/tools/validator';
import { breakpointDataBaseRuleMap } from './BreakpointDataBase';

export const lineBreakpointDataBaseRuleMap: InterfaceToRuleMap<LineBreakpointDataBase> = {
  ...breakpointDataBaseRuleMap,
  fileName: validators.string(),
  line: validators.number(),
  character: validators.number().optional(),
};
