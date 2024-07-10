import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig, NormalizedDebugConfig } from '../../../types/dap/config.types';
import { AttributeWarningError } from '../error';

export const attributeName = 'useDebugDirective';
export const defaultValue: DebugConfig['useDebugDirective'] = undefined;
export const normalizedDefaultValue: NormalizedDebugConfig['useDebugDirective'] = {
  useBreakpointDirective: true,
  useClearConsoleDirective: true,
  useOutputDirective: true,
};
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    isDebugDirective,
    [
      validators.expectUndefined((value) => value),
      validators.expectBoolean((value) => (value ? normalizedDefaultValue : undefined)),
      validators.expectObjectLiteral((value) => ({ ...normalizedDefaultValue, value })),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
  return Promise.resolve();

  // #region helpers
  function isDebugDirective(value: any): value is NormalizedDebugConfig['useDebugDirective'] {
    if (value === undefined) {
      return true;
    }

    return predicate.isObject(value, {
      useBreakpointDirective: predicate.strictly(predicate.isBoolean, new AttributeWarningError(attributeName, 'useBreakpointDirective', '')),
      useOutputDirective: predicate.strictly(predicate.isBoolean, new AttributeWarningError(attributeName, 'useOutputDirective', '')),
      useClearConsoleDirective: predicate.strictly(predicate.isBoolean, new AttributeWarningError(attributeName, 'useClearConsoleDirective', '')),
    });
  }
  // #endregion helpers
};

