import * as validators from '../../../../tools/validator';
import { MatchPattern, VariableExactPattern, VariablePrefixPattern, VariableRegExPattern, VariableSuffixPattern, VariableWildcardPattern } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';
import * as variablePatternBase from './VariablePatternBase';

export const attributeRule: AttributeRule<MatchPattern> = validators.alternative(
  validators.string(),
  validators.object<VariableRegExPattern>({
    ...variablePatternBase.attributeRuleMap,
    patternType: validators.literalUnion('regex', 'regexp'),
  }),
  validators.object<VariablePrefixPattern>({
    ...variablePatternBase.attributeRuleMap,
    patternType: validators.literalUnion('prefix'),
  }),
  validators.object<VariableSuffixPattern>({
    ...variablePatternBase.attributeRuleMap,
    patternType: validators.literalUnion('suffix'),
  }),
  validators.object<VariableExactPattern>({
    ...variablePatternBase.attributeRuleMap,
    patternType: validators.literalUnion('exact'),
  }),
  validators.object<VariableExactPattern>({
    ...variablePatternBase.attributeRuleMap,
    patternType: validators.literalUnion('exact'),
  }),
  validators.object<VariableWildcardPattern>({
    ...variablePatternBase.attributeRuleMap,
    patternType: validators.literalUnion('wildcard'),
  }),
);
