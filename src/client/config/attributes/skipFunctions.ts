import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'skipFunctions';
export const defaultValue: DebugConfig['skipFunctions'] = undefined;
export const attributeRule: AttributeRule<DebugConfig['skipFunctions']> = validators.array(validators.string()).optional();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['skipFunctions'], DebugConfig> = {
  undefined() {
    return defaultValue;
  },
};
