import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'useDebugDirective';
export const defaultValue: DebugConfig['useDebugDirective'] = {
  useBreakpointDirective: false,
  useClearConsoleDirective: false,
  useOutputDirective: false,
};
export const attributeRule: AttributeRule<DebugConfig['useDebugDirective']> = validators.object({
  useBreakpointDirective: validators.boolean(),
  useClearConsoleDirective: validators.boolean(),
  useOutputDirective: validators.boolean(),
}).optional();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['useDebugDirective'], DebugConfig> = {
  undefined() {
    return defaultValue;
  },
  boolean(value) {
    return {
      useBreakpointDirective: value,
      useClearConsoleDirective: value,
      useOutputDirective: value,
    };
  },
};

