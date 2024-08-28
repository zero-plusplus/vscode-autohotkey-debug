import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'name';
export const defaultValue: DebugConfig['name'] = 'AutoHotkey Debug';
export const attributeRule: AttributeRule<DebugConfig['name']> = validators.string();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['name'], DebugConfig> = {
  undefined: () => defaultValue,
};
