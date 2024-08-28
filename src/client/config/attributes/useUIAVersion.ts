import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'useUIAVersion';
export const defaultValue: DebugConfig['useUIAVersion'] = false;
export const attributeRule: AttributeRule<DebugConfig['useUIAVersion']> = validators.boolean();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['useUIAVersion'], DebugConfig> = {
  undefined: () => defaultValue,
};
