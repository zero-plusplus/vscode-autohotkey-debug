import { CategoryItemBase } from '../../../../types/dap/variableCategory.types';
import { InterfaceToRuleMap } from '../../../../types/tools/validator';
import * as visibleCondition from '../setBreakpoints/VisibleCondition';

export const attributeRuleMap: InterfaceToRuleMap<CategoryItemBase> = {
  visible: visibleCondition.attributeRule.optional(),
};
