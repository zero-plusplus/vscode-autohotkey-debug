import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'type';
export const defaultValue: DebugConfig['type'] = 'autohotkey';
export const attributeRule: AttributeRule<DebugConfig['type']> = validators.literalUnion('autohotkey');
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['type'], DebugConfig> = {
  undefined: () => defaultValue,
};
