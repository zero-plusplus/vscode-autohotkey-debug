import * as validators from '../../../tools/validator';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

const keyRule = validators.string();
const valueRule = validators.string().optional();

export const attributeName = 'env';
export const defaultValue: DebugConfig['env'] = undefined;
export const attributeRule: AttributeRule<DebugConfig['env']> = validators.record<NonNullable<DebugConfig['env']>>(
  keyRule,
  valueRule,
).optional();
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['env'], DebugConfig> = {
  undefined: () => defaultValue,
  object: (value, schema, onError) => {
    const normalized: DebugConfig['env'] = {};

    for (const [ key, childValue ] of Object.entries(value)) {
      try {
        if (valueRule.config.validator(childValue, onError)) {
          normalized[key] = childValue;
          continue;
        }
      }
      catch (e: unknown) {
        onError(new validators.NormalizationWarning(`${attributeName}.${key} was ignored.`, { cause: e }));
      }
    }
    return normalized;
  },
};
