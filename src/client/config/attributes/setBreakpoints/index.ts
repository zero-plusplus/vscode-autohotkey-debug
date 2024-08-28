import { DebugConfig } from '../../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../../types/tools/validator';
import * as breakpointDataArray from './BreakpointDataArray';

export const attributeName = 'setBreakpoints';
export const defaultValue: DebugConfig['setBreakpoints'] = undefined;
export const attributeRule: AttributeRule<DebugConfig['setBreakpoints']> = breakpointDataArray.attributeRule.optional();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['setBreakpoints'], DebugConfig> = {
  undefined() {
    return defaultValue;
  },
};
