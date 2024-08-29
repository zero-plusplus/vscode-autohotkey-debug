import * as validators from '../../../../tools/validator';
import { MatchPattern, VariableExactPattern, VariablePrefixPattern, VariableRegExPattern, VariableSuffixPattern, VariableWildcardPattern } from '../../../../types/dap/variableCategory.types';
import { AttributeRule } from '../../../../types/tools/validator';
import { variablePatternBaseRuleMap } from './VariablePatternBase';

export const matchPatternRule: AttributeRule<MatchPattern> = validators.alternative(
  validators.string(),
  validators.object<VariableRegExPattern>({
    ...variablePatternBaseRuleMap,
    patternType: validators.literalUnion('regex', 'regexp'),
  }),
  validators.object<VariablePrefixPattern>({
    ...variablePatternBaseRuleMap,
    patternType: validators.literalUnion('prefix'),
  }),
  validators.object<VariableSuffixPattern>({
    ...variablePatternBaseRuleMap,
    patternType: validators.literalUnion('suffix'),
  }),
  validators.object<VariableExactPattern>({
    ...variablePatternBaseRuleMap,
    patternType: validators.literalUnion('exact'),
  }),
  validators.object<VariableExactPattern>({
    ...variablePatternBaseRuleMap,
    patternType: validators.literalUnion('exact'),
  }),
  validators.object<VariableWildcardPattern>({
    ...variablePatternBaseRuleMap,
    patternType: validators.literalUnion('wildcard'),
  }),
);
