import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig, NormalizedDebugConfig } from '../../../types/dap/config.types';
import { AttributeWarningError } from '../error';

export const attributeName = 'useLoadedScripts';
export const defaultValue: DebugConfig['useLoadedScripts'] = false;
export const normalizedDefaultValue: NormalizedDebugConfig['useLoadedScripts'] = {
  scanImplicitLibrary: false,
};
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    isLoadedScriptsConfig,
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
  function isLoadedScriptsConfig(value: any): value is NormalizedDebugConfig['useLoadedScripts'] {
    if (predicate.isUndefined(value)) {
      return true;
    }

    return predicate.isObject(value, {
      scanImplicitLibrary: predicate.strictly(predicate.isBoolean, new AttributeWarningError(attributeName, 'scanImplicitLibrary', '')),
    });
  }
  // #endregion helpers
};
