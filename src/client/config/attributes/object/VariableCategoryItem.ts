import * as validators from '../../../../tools/validator';
import { VariableCategoryItem } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';
import { categoryItemBaseRuleMap } from './CategoryItemBase';
import * as sourceName from './SourceName';

export const variableCategoryItemRule: AttributeRule<VariableCategoryItem> = validators.object<VariableCategoryItem>({
  ...categoryItemBaseRuleMap,
  variableName: validators.string(),
  scope: sourceName.sourceNameRule,
});
