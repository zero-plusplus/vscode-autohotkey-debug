import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'stopOnEntry';
export const defaultValue: DebugConfig['stopOnEntry'] = false;
export const attributeRule: AttributeRule<DebugConfig['stopOnEntry']> = validators.boolean();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['stopOnEntry'], DebugConfig> = {
  undefined: () => defaultValue,
};
