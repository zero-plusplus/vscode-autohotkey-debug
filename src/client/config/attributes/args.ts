import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig, NormalizedDebugConfig } from '../../../types/dap/config.types';
import { NormalizationError } from '../../../tools/validator/error';

export const attributeName = 'args';
export const defaultValue: DebugConfig['args'] = [];
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    predicate.isStringArray,
    [
      validators.expectUndefined(() => defaultValue),
      validators.expectStringArray((value: string[]) => value),
      validators.expectAny((value: any) => {
        if (!Array.isArray(value)) {
          throw new NormalizationError(attributeName, value);
        }

        const args: NormalizedDebugConfig['args'] = [];
        for (const [ index, element ] of Object.entries(value)) {
          if (predicate.isString(element)) {
            args.push(element);
            continue;
          }

          checker.warning(`The ${attributeName} must be an array of strings; the ${index + 1}th element of the ${attributeName} was ignored because it is not a string.`);
        }
        return args;
      }),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
};
