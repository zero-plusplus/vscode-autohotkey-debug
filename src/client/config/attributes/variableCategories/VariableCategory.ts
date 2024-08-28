import * as validators from '../../../../tools/validator';
import { VariableCategory, definedCategoryNames } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as categoryItem from './CategoryItem';
import * as visibleCondition from '../setBreakpoints/VisibleCondition';
import * as variableMatcher from './VariableMatcher';

export const attributeRule: AttributeRule<VariableCategory> = validators.object<VariableCategory>({
  label: validators.string(),
  items: validators.array(categoryItem.attributeRule),
  visible: visibleCondition.attributeRule.optional(),
  filters: validators.alternative(
    validators.literalUnion(...definedCategoryNames),
    validators.array(variableMatcher.attributeRule),
  ).optional(),
});
