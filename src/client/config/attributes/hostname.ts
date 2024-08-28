import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'hostname';
export const defaultValue: DebugConfig['hostname'] = '127.0.0.1';
export const attributeRule: AttributeRule<DebugConfig['hostname']> = validators.string();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['hostname'], DebugConfig> = {
  undefined: () => defaultValue,
  string: (value) => {
    return value === 'localhost' ? defaultValue : value;
  },
};
