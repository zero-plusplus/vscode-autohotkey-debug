import * as validators from '../../../../tools/validator';
import { ExpressionCategoryItem } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';
import { categoryItemBaseRuleMap } from './CategoryItemBase';

export const expressionCategoryItemRule: AttributeRule<ExpressionCategoryItem> = validators.object<ExpressionCategoryItem>({
  ...categoryItemBaseRuleMap,
  label: validators.string(),
  expression: validators.string().optional().depends('label'),
}).normalizeProperties({
  expression: {
    undefined: (value, schema) => {
      if (schema.isNormalized('label')) {
        return schema.getNormalizedAttribute('label');
      }
      return value as unknown as string;
    },
  },
});
