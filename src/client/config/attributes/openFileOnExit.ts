import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'openFileOnExit';
export const defaultValue: DebugConfig['openFileOnExit'] = undefined;
export const attributeRule: AttributeRule<DebugConfig['openFileOnExit']> = validators.file().optional();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['openFileOnExit'], DebugConfig> = {
  undefined: () => defaultValue,
};
