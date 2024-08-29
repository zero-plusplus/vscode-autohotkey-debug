import * as validators from '../../../../tools/validator';
import { NamedBreakpointDataBase } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { InterfaceToRuleMap } from '../../../../types/tools/validator';
import { breakpointDataBaseRuleMap } from './BreakpointDataBase';

export const namedBreakpointDataBaseRuleMap: InterfaceToRuleMap<NamedBreakpointDataBase> = {
  ...breakpointDataBaseRuleMap,
  name: validators.string(),
};
