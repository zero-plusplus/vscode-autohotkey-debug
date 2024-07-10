import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig, NormalizedDebugConfig } from '../../../types/dap/config.types';
import { NormalizationError } from '../../../tools/validator/error';

export const attributeName = 'env';
export const defaultValue: DebugConfig['env'] = undefined;
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    isProcessEnv,
    [
      validators.expectUndefined(() => defaultValue),
      validators.expectObjectLiteral((value: object) => {
        const normalized: NormalizedDebugConfig['env'] = {};

        for (const [ key, childValue ] of Object.entries(value)) {
          if (!isChildValue(childValue)) {
            throw new NormalizationError(`${attributeName}.key`, value);
          }
          normalized[key] = childValue;
        }
        return normalized;
      }),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
  return Promise.resolve();

  // #region helpers
  function isChildValue(value: any): value is string | undefined {
    return predicate.isString(value) || predicate.isUndefined(value);
  }
  function isProcessEnv(value: any): value is NormalizedDebugConfig['env'] {
    if (predicate.isUndefined(value)) {
      return true;
    }

    if (!predicate.isObjectLiteral(value)) {
      return false;
    }
    for (const [ , childValue ] of Object.entries(value as Record<string, any>)) {
      if (isChildValue(childValue)) {
        continue;
      }
      return false;
    }
    return true;
  }
  // #endregion helpers
};

