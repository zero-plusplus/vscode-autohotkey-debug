import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'noDebug';
export const defaultValue: DebugConfig['noDebug'] = false;
export const attributeRule: AttributeRule<DebugConfig['noDebug']> = validators.boolean();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['noDebug'], DebugConfig> = {
  undefined: () => defaultValue,
};
