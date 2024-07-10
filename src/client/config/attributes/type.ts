import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig, NormalizedDebugConfig } from '../../../types/dap/config.types';

export const attributeName = 'type';
export const defaultValue: DebugConfig['type'] = 'autohotkey';
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    (value: any): value is NormalizedDebugConfig['type'] => predicate.isString(value) && value === defaultValue,
    [
      validators.expectUndefined(() => defaultValue),
      validators.expectString((value: string) => {
        if (value === defaultValue) {
          return value;
        }
        checker.warning(`The ${attributeName} attribute must be "${defaultValue}".\nSpecified: "${value}"`);
        return defaultValue;
      }),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
};
