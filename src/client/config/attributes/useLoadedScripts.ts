import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'useLoadedScripts';
export const defaultValue: DebugConfig['useLoadedScripts'] = false;
export const attributeRule: AttributeRule<DebugConfig['useLoadedScripts']> = validators.alternative(
  validators.boolean(),
  validators.object({
    scanImplicitLibrary: validators.boolean(),
  }),
);
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['useLoadedScripts'], DebugConfig> = {
  undefined() {
    return defaultValue;
  },
};
