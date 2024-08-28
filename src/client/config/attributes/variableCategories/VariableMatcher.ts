import * as validators from '../../../../tools/validator';
import { VariableMatcher } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as matchPattern from './MatchPattern';
import * as variableAttributes from './VariableAttributes';

export const attributeRule: AttributeRule<VariableMatcher> = validators.object<VariableMatcher>({
  pattern: matchPattern.attributeRule.optional(),
  attributes: variableAttributes.attributeRule.optional(),
});
