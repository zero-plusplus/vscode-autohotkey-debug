import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'useAnnounce';
export const defaultValue: DebugConfig['useAnnounce'] = 'detail';
export const attributeRule: AttributeRule<DebugConfig['useAnnounce']> = validators.literalUnion<DebugConfig['useAnnounce']>(
  false,
  'error',
  'detail',
  'develop',
);
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['useAnnounce'], DebugConfig> = {
  undefined: () => defaultValue,
};
