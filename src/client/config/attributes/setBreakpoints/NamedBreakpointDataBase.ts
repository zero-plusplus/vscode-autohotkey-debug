import * as validators from '../../../../tools/validator';
import { NamedBreakpointDataBase } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { InterfaceToRuleMap } from '../../../../types/tools/validator';
import * as breakpointDataBase from './BreakpointDataBase';

export const attributeRuleMap: InterfaceToRuleMap<NamedBreakpointDataBase> = {
  ...breakpointDataBase.attributeRuleMap,
  name: validators.string(),
};
