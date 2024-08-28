import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'useIntelliSenseInDebugging';
export const defaultValue: DebugConfig['useIntelliSenseInDebugging'] = false;
export const attributeRule: AttributeRule<DebugConfig['useIntelliSenseInDebugging']> = validators.boolean();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['useIntelliSenseInDebugging'], DebugConfig> = {
  undefined: () => defaultValue,
};
