import { checkPortUsed, range } from '../../../tools/utils';
import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { DebugConfig } from '../../../types/dap/config.types';
import { AttributeNormalizersByType, AttributeRule } from '../../../types/tools/validator';

export const attributeName = 'port';
export const defaultValue: DebugConfig['port'] = 9002;
export const attributeRule: AttributeRule<DebugConfig['port']> = validators.number().min(1024).max(65535);
export const attributeNormalizer: AttributeNormalizersByType<DebugConfig['port'], DebugConfig> = {
  undefined() {
    return defaultValue;
  },
  async string(value, schema, onError) {
    const portsRegexp = /(?<start>\d+)-(?<end>\d+)/u;
    if (!portsRegexp.test(value)) {
      onError(new validators.NormalizationError(`\`${attributeName}\` should be specified as "9002-9010", but the actual value \`${value}\` was specified.`));
      return value as unknown as number;
    }

    const match = value.match(portsRegexp)!;
    const { start, end } = match.groups!;
    return await this.array!(range(Number(start), Number(end)), schema, onError);
  },
  async array(value, schema, onError) {
    for await (const [ index, port ] of Object.entries(value)) {
      if (!predicate.isNumber(port)) {
        onError(new validators.NormalizationWarning(`\`${attributeName}[${index}]\` was ignored because it is not a number representing a port.`));
        continue;
      }

      const isPortUsed = await checkPortUsed(port);
      if (!isPortUsed) {
        return port;
      }
    }
    throw new validators.NormalizationError(attributeName);
  },
};
