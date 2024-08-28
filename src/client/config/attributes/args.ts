import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'args';
export const defaultValue: DebugConfig['args'] = [];
export const attributeRule: AttributeRule<DebugConfig['args']> = validators.array(validators.string());
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['args'], DebugConfig> = {
  undefined() {
    return defaultValue;
  },
  array: (values, schema, onError) => {
    const args: DebugConfig['args'] = [];
    for (const [ index, element ] of Object.entries(values)) {
      if (predicate.isString(element)) {
        args.push(element);
        continue;
      }
      onError(new validators.ValidationWarning(`The ${attributeName} must be an array of strings; the ${index + 1}th element of the ${attributeName} was ignored because it is not a string.`));
    }
    return args;
  },
};
