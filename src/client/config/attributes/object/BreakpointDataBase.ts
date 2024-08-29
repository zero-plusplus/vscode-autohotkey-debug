import * as validators from '../../../../tools/validator';
import { BreakpointDataBase } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { InterfaceToRuleMap } from '../../../../types/tools/validator';
import { breakpointKindRule } from './BreakpointKind';
import { visibleConditionRule } from './VisibleCondition';

export const breakpointDataBaseRuleMap: InterfaceToRuleMap<BreakpointDataBase> = {
  kind: breakpointKindRule,
  hidden: visibleConditionRule.optional(),
  temporary: validators.boolean().optional(),
  condition: validators.string().optional(),
  hitCondition: validators.string().optional(),
  logMessage: validators.string().optional(),
};
