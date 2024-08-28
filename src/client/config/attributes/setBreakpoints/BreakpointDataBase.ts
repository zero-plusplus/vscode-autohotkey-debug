import * as validators from '../../../../tools/validator';
import { BreakpointDataBase } from '../../../../types/tools/autohotkey/runtime/breakpoint.types';
import { InterfaceToRuleMap } from '../../../../types/tools/validator';
import * as breakpointKind from './BreakpointKind';
import * as visibleCondition from './VisibleCondition';

export const attributeRuleMap: InterfaceToRuleMap<BreakpointDataBase> = {
  kind: breakpointKind.attributeRule,
  hidden: visibleCondition.attributeRule.optional(),
  temporary: validators.boolean().optional(),
  condition: validators.string().optional(),
  hitCondition: validators.string().optional(),
  logMessage: validators.string().optional(),
};
