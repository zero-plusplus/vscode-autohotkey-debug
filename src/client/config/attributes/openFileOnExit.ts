import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig } from '../../../types/dap/config.types';
import { NormalizationError } from '../../../tools/validator/error';

export const attributeName = 'openFileOnExit';
export const defaultValue: DebugConfig['openFileOnExit'] = undefined;
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    (value: any) => predicate.isUndefined(value) || predicate.isString(value),
    [
      validators.expectUndefined(() => defaultValue),
      validators.expectString((value: string) => {
        if (!predicate.fileExists(value)) {
          throw new NormalizationError(attributeName, value);
        }
        return value;
      }),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
};
