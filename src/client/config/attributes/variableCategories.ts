import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';
import { variableCategoryRule } from './object';

export const attributeName = 'variableCategories';
export const defaultValue: DebugConfig['variableCategories'] = false;
export const recommendValue: DebugConfig['variableCategories'] = [
  {
    label: 'Local',
    items: [ { source: 'Local', select: { attributes: { isStatic: false } } } ],
  },
  {
    label: 'Static',
    items: [ { source: 'Static' } ],
  },
  {
    label: 'Static',
    items: [ { source: 'Local', select: { attributes: { isStatic: true } } } ],
  },
  {
    label: 'Global',
    items: [ { source: 'Global' } ],
    filters: [
      { pattern: '/\\d/' },
      { attributes: { isBuiltin: false } },
    ],
  },
  {
    label: 'Builtin-Global',
    items: [ { source: 'Global' } ],
    filters: [
      { pattern: '/\\d/' },
      { attributes: { isBuiltin: true } },
    ],
  },
];
export const attributeRule: AttributeRule<DebugConfig['variableCategories']> = validators.alternative(
  validators.literalUnion(false),
  validators.array(variableCategoryRule),
);
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['variableCategories'], DebugConfig> = {
  undefined() {
    return defaultValue;
  },
  string(value) {
    if (value === 'recommend') {
      return recommendValue;
    }
    return value as unknown as DebugConfig['variableCategories'];
  },
};
