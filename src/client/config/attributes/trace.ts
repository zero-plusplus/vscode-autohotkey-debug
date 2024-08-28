import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'trace';
export const defaultValue: DebugConfig['trace'] = false;
export const attributeRule: AttributeRule<DebugConfig['trace']> = validators.boolean();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['trace'], DebugConfig> = {
  undefined: () => defaultValue,
};
