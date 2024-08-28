import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'request';
export const defaultValue: DebugConfig['request'] = 'launch';
export const attributeRule: AttributeRule<DebugConfig['request']> = validators.literalUnion('launch', 'attach');
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['request'], DebugConfig> = {
  undefined: () => defaultValue,
};
