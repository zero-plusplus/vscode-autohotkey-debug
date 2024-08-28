import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';
import { PerfTipsConfig } from '../../../types/dap/perftips.types.';

export const attributeName = 'usePerfTips';
export const defaultValue: DebugConfig['usePerfTips'] = false;
export const enabledDefaultValue: PerfTipsConfig = {
  fontColor: 'gray',
  fontStyle: 'italic',
  format: '{<$elapsedTime_s>}s elapsed',
};
export const attributeRule: AttributeRule<DebugConfig['usePerfTips']> = validators.alternative(
  validators.literalUnion(false),
  validators.object<PerfTipsConfig>({
    fontColor: validators.string().default(enabledDefaultValue.fontColor),
    fontStyle: validators.string().default(enabledDefaultValue.fontStyle),
    format: validators.string().default(enabledDefaultValue.format),
  }),
);
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['usePerfTips'], DebugConfig> = {
  undefined() {
    return defaultValue;
  },
  boolean(value) {
    if (value) {
      return enabledDefaultValue;
    }
    return value;
  },
};
