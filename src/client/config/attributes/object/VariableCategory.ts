import * as validators from '../../../../tools/validator';
import { VariableCategory, definedCategoryNames } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as categoryItem from './CategoryItem';
import { visibleConditionRule } from './VisibleCondition';
import * as variableMatcher from './VariableMatcher';

export const variableCategoryRule: AttributeRule<VariableCategory> = validators.object<VariableCategory>({
  label: validators.string(),
  items: validators.array(categoryItem.categoryItemRule),
  visible: visibleConditionRule.optional(),
  filters: validators.alternative(
    validators.literalUnion(...definedCategoryNames),
    validators.array(variableMatcher.variableMatcherRule),
  ).optional(),
});
