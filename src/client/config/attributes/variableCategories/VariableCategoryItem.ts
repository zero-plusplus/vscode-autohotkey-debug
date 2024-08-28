import * as validators from '../../../../tools/validator';
import { VariableCategoryItem } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as categoryItemBase from './CategoryItemBase';
import * as sourceName from './SourceName';

export const attributeRule: AttributeRule<VariableCategoryItem> = validators.object<VariableCategoryItem>({
  ...categoryItemBase.attributeRuleMap,
  variableName: validators.string(),
  scope: sourceName.attributeRule,
});
