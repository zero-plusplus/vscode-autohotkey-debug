import * as validators from '../../../../tools/validator';
import { CategoryItemSelector } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';
import { categoryItemBaseRuleMap } from './CategoryItemBase';
import { sourceNameRule } from './SourceName';
import { sourceSelectorRule } from './SourceSelector';
import { variableMatcherRule } from './VariableMatcher';

export const categoryItemSelectorRule: AttributeRule<CategoryItemSelector> = validators.object<CategoryItemSelector>({
  ...categoryItemBaseRuleMap,
  source: validators.alternative(
    sourceSelectorRule,
    validators.array(sourceNameRule),
  ),
  select: validators.alternative(
    validators.string(),
    variableMatcherRule,
  ).optional(),
});
