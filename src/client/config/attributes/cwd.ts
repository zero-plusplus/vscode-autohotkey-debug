import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig } from '../../../types/dap/config.types';
import { NormalizationError } from '../../../tools/validator/error';

export const attributeName = 'cwd';
export const defaultValue: DebugConfig['cwd'] = undefined;
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    (value: any) => predicate.isString(value) || predicate.isUndefined(value),
    [
      validators.expectUndefined(() => defaultValue),
      validators.expectString((value: string) => {
        if (!predicate.directoryExists(value)) {
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
