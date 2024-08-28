import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'skipFiles';
export const defaultValue: DebugConfig['skipFiles'] = undefined;
export const attributeRule: AttributeRule<DebugConfig['skipFiles']> = validators.array(validators.string()).optional();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['skipFiles'], DebugConfig> = {
  undefined() {
    return defaultValue;
  },
};
