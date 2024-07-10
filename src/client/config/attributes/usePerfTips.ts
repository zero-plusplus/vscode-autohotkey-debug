import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig, NormalizedDebugConfig } from '../../../types/dap/config.types';
import { AttributeWarningError } from '../error';

export const attributeName = 'usePerfTips';
export const defaultValue: DebugConfig['usePerfTips'] = false;
export const normalizedDefaultValue: NormalizedDebugConfig['usePerfTips'] = {
  fontColor: 'gray',
  fontStyle: 'italic',
  format: '{<$elapsedTime_s>}s elapsed',
};
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    isPerfTipsConfig,
    [
      validators.expectUndefined((value) => value),
      validators.expectBoolean((value) => (value ? normalizedDefaultValue : undefined)),
      validators.expectObjectLiteral((value) => ({ ...normalizedDefaultValue, ...value })),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
  return Promise.resolve();

  // #region helpers
  function isPerfTipsConfig(value: any): value is NormalizedDebugConfig['usePerfTips'] {
    if (predicate.isUndefined(value)) {
      return false;
    }

    return predicate.isObject(value, {
      fontColor: predicate.strictly(predicate.isString, new AttributeWarningError(attributeName, 'fontColor', '')),
      fontStyle: predicate.strictly(predicate.isString, new AttributeWarningError(attributeName, 'fontStyle', '')),
      format: predicate.strictly(predicate.isString, new AttributeWarningError(attributeName, 'format', '')),
    });
  }
  // #endregion helpers
};
