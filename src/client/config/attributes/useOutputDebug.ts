import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { MessageCategory, messageCategories } from '../../../types/dap/adapter/adapter.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';
import { OutputDebugConfig } from '../../../types/client/config/attributes/useOutputDebug.types';

export const attributeName = 'useOutputDebug';
export const defaultValue: DebugConfig['useOutputDebug'] = false;
export const enabledDefaultValue: DebugConfig['useOutputDebug'] = {
  category: 'stdout',
  useTrailingLinebreak: false,
};
export const attributeRule: AttributeRule<DebugConfig['useOutputDebug']> = validators.alternative(
  validators.literalUnion(false),
  validators.object<OutputDebugConfig>({
    category: validators.literalUnion<MessageCategory>(...messageCategories).default(enabledDefaultValue.category),
    useTrailingLinebreak: validators.boolean().default(enabledDefaultValue.useTrailingLinebreak),
  }),
);
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['useOutputDebug'], DebugConfig> = {
  undefined() {
    return defaultValue;
  },
  boolean(value) {
    if (value) {
      return enabledDefaultValue;
    }
    return value;
  },
};
