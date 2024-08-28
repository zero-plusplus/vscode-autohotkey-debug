import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'useAutoJumpToError';
export const defaultValue: DebugConfig['useAutoJumpToError'] = false;
export const attributeRule: AttributeRule<DebugConfig['useAutoJumpToError']> = validators.boolean();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['useAutoJumpToError'], DebugConfig> = {
  undefined: () => defaultValue,
};
