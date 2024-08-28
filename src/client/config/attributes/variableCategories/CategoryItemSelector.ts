import * as validators from '../../../../tools/validator';
import { CategoryItemSelector } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as categoryItemBase from './CategoryItemBase';
import * as sourceName from './SourceName';
import * as sourceSelector from './SourceSelector';
import * as variableMatcher from './VariableMatcher';

export const attributeRule: AttributeRule<CategoryItemSelector> = validators.object<CategoryItemSelector>({
  ...categoryItemBase.attributeRuleMap,
  source: validators.alternative(
    sourceSelector.attributeRule,
    validators.array(sourceName.attributeRule),
  ),
  select: validators.alternative(
    validators.string(),
    variableMatcher.attributeRule,
  ).optional(),
});
