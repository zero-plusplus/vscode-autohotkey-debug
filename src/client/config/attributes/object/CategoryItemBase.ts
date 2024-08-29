import { CategoryItemBase } from '../../../../types/dap/variableCategory.types';
import { InterfaceToRuleMap } from '../../../../types/tools/validator';
import { visibleConditionRule } from './VisibleCondition';

export const categoryItemBaseRuleMap: InterfaceToRuleMap<CategoryItemBase> = {
  visible: visibleConditionRule.optional(),
};
