import * as validators from '../../../../tools/validator';
import { VariableMatcher } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';
import { matchPatternRule } from './MatchPattern';
import { variableAttributesRule } from './VariableAttributes';

export const variableMatcherRule: AttributeRule<VariableMatcher> = validators.object<VariableMatcher>({
  pattern: matchPatternRule.optional(),
  attributes: variableAttributesRule.optional(),
});
