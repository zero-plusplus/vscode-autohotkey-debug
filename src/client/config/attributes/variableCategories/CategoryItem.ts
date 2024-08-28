import * as validators from '../../../../tools/validator';
import { CategoryItem } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as variableCategoryItem from './VariableCategoryItem';
import * as expressionCategoryItem from './ExpressionCategoryItem';
import * as categoryItemSelector from './CategoryItemSelector';

export const attributeRule: AttributeRule<CategoryItem> = validators.alternative(
  variableCategoryItem.attributeRule,
  expressionCategoryItem.attributeRule,
  categoryItemSelector.attributeRule,
);
