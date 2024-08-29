import * as validators from '../../../../tools/validator';
import { CategoryItem } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';
import { variableCategoryItemRule } from './VariableCategoryItem';
import { expressionCategoryItemRule } from './ExpressionCategoryItem';
import { categoryItemSelectorRule } from './CategoryItemSelector';

export const categoryItemRule: AttributeRule<CategoryItem> = validators.alternative(
  variableCategoryItemRule,
  expressionCategoryItemRule,
  categoryItemSelectorRule,
);
