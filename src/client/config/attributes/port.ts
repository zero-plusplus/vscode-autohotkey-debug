import { checkPortUsed, range } from '../../../tools/utils';
import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig } from '../../../types/dap/config.types';
import { NormalizationError } from '../../../tools/validator/error';

export const attributeName = 'port';
export const defaultValue: DebugConfig['port'] = 9002;
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    isValidPort,
    [
      validators.expectUndefined(() => defaultValue),
      validators.expectString(async(value: string) => {
        const portsRegexp = /(?<start>\d+)-(?<end>\d+)/u;
        if (!portsRegexp.test(value)) {
          throw new NormalizationError(attributeName, value);
        }
        const match = value.match(portsRegexp)!;
        const { start, end } = match.groups!;

        const startPort = Number(start);
        const endPort = Number(end);
        return normalizeNumberArray(range(startPort, endPort));
      }),
      validators.expectNumber((value: number) => {
        if (isValidPort(value)) {
          return value;
        }
        throw new NormalizationError(attributeName, value);
      }),
      validators.expectNumberArray(normalizeNumberArray),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
  return Promise.resolve();

  // #region helpers
  function isValidPort(value: any): value is number {
    if (!predicate.isNumber(value)) {
      return false;
    }

    const registeredPortStart = 1024;
    const privatePortEnd = 65535;
    return registeredPortStart <= value && value <= privatePortEnd;
  }
  async function normalizeNumberArray(value: number[]): Promise<number> {
    for await (const port of value) {
      const isPortUsed = await checkPortUsed(port);
      if (!isPortUsed) {
        return port;
      }
    }
    throw new NormalizationError(attributeName, value);
  }
  // #endregion helpers
};

