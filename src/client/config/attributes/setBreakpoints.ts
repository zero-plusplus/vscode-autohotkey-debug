import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';
import { breakpointDataArrayRule } from './object';

export const attributeName = 'setBreakpoints';
export const defaultValue: DebugConfig['setBreakpoints'] = undefined;
export const attributeRule: AttributeRule<DebugConfig['setBreakpoints']> = breakpointDataArrayRule.optional();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['setBreakpoints'], DebugConfig> = {
  undefined() {
    return defaultValue;
  },
};
