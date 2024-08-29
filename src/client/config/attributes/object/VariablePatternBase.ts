import * as validators from '../../../../tools/validator';
import { VariablePatternBase, patternTypes } from '../../../../types/dap/variableCategory.types';
import { InterfaceToRuleMap } from '../../../../types/tools/validator';

export const variablePatternBaseRuleMap: InterfaceToRuleMap<VariablePatternBase> = {
  patternType: validators.literalUnion(...patternTypes),
  pattern: validators.string(),
  ignorecase: validators.boolean(),
};
