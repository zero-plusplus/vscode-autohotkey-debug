import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';
import { checkUtf8WithBomByFile } from '../../../tools/utils';

export const attributeName = 'runtimeArgs';
export const defaultValue: DebugConfig['runtimeArgs'] = [ '/ErrorStdOut' ];
export const defaultValueByUtf8WithBom: DebugConfig['runtimeArgs'] = [ '/CP65001', '/ErrorStdOut=UTF-8' ];
export const attributeRule: AttributeRule<DebugConfig['runtimeArgs']> = validators.array(validators.string());
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['runtimeArgs'], DebugConfig> = {
  async undefined(value, schema, onError) {
    if (schema.isNormalized('program')) {
      const program = schema.getNormalizedAttribute('program');
      if (await checkUtf8WithBomByFile(program)) {
        return defaultValueByUtf8WithBom;
      }
    }

    return defaultValue;
  },
  array(values, schema, onError) {
    const normalized: DebugConfig['runtimeArgs'] = [];
    for (const [ index, value ] of Object.entries(values)) {
      if (predicate.isString(value)) {
        normalized.push(value);
        continue;
      }
      onError(new validators.ValidationWarning(`The \`${attributeName}\` must be an array of strings; the ${index + 1}th element of the ${attributeName} was ignored because it is not a string.`));
    }
    return normalized;
  },
};
