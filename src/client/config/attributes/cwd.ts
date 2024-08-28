import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'cwd';
export const defaultValue: DebugConfig['cwd'] = undefined;
export const attributeRule: AttributeRule<DebugConfig['cwd']> = validators.directory().optional();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['cwd'], DebugConfig> = {
  undefined: () => defaultValue,
};
