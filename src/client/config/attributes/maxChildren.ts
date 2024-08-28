import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'maxChildren';
export const defaultValue: DebugConfig['maxChildren'] = 1000;
export const attributeRule: AttributeRule<DebugConfig['maxChildren']> = validators.number().positive();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['maxChildren'], DebugConfig> = {
  undefined: () => defaultValue,
};
