import * as validators from '../../../tools/validator';
// import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig, NormalizedDebugConfig } from '../../../types/dap/config.types';
import { AnnounceLevel } from '../../../types/client/config/attributes/useAnnounce.types';

export const attributeName = 'useAnnounce';
export const defaultValue: DebugConfig['useAnnounce'] = 'detail';
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    isAnnouceLevel,
    [
      validators.expectUndefined((): NormalizedDebugConfig['useAnnounce'] => defaultValue),
      validators.expectBoolean((value: boolean): NormalizedDebugConfig['useAnnounce'] => {
        return value ? defaultValue : undefined;
      }),
      validators.expectString((value: string) => {
        if (isAnnouceLevel(value)) {
          return value;
        }

        checker.warning('');
        return defaultValue;
      }),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
  return Promise.resolve();

  // #region helpers
  function isAnnouceLevel(value: any): value is AnnounceLevel {
    return value === 'error' || value === 'detail';
  }
  // #endregion helpers
};
