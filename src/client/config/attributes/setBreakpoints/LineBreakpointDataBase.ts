import * as validators from '../../../../tools/validator';
import { LineBreakpointDataBase } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { InterfaceToRuleMap } from '../../../../types/tools/validator';
import * as breakpointDataBase from './BreakpointDataBase';

export const attributeRuleMap: InterfaceToRuleMap<LineBreakpointDataBase> = {
  ...breakpointDataBase.attributeRuleMap,
  fileName: validators.string(),
  line: validators.number(),
  character: validators.number().optional(),
};
