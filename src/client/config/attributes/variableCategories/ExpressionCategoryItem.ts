import * as validators from '../../../../tools/validator';
import { ExpressionCategoryItem } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as categoryItemBase from './CategoryItemBase';

export const attributeRule: AttributeRule<ExpressionCategoryItem> = validators.object<ExpressionCategoryItem>({
  ...categoryItemBase.attributeRuleMap,
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
