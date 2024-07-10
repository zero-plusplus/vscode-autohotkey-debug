import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig, NormalizedDebugConfig } from '../../../types/dap/config.types';
import { AttributeWarningError } from '../error';
import { messageCategories } from '../../../types/dap/adapter/adapter.types';

export const attributeName = 'useOutputDebug';
export const defaultValue: DebugConfig['useOutputDebug'] = undefined;
export const normalizedDefaultValue: NormalizedDebugConfig['useOutputDebug'] = {
  category: 'stderr',
  useTrailingLinebreak: false,
};
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    isOutputDebug,
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
  function isMessageCategory(value: any): value is NonNullable<NormalizedDebugConfig['useOutputDebug']>['category'] {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return messageCategories.includes(value);
  }
  function isOutputDebug(value: any): value is NormalizedDebugConfig['useOutputDebug'] {
    if (predicate.isUndefined(value)) {
      return true;
    }

    return predicate.isObject(value, {
      category: predicate.strictly(isMessageCategory, new AttributeWarningError(attributeName, 'category', '')),
      useTrailingLinebreak: predicate.strictly(predicate.isBoolean, new AttributeWarningError(attributeName, 'useTrailingLinebreak', '')),
    });
  }
  // #endregion helpers
};
