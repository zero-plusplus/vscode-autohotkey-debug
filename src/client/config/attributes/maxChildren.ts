import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig } from '../../../types/dap/config.types';

export const attributeName = 'maxChildren';
export const defaultValue: DebugConfig['maxChildren'] = 1000;
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    predicate.isNumber,
    [
      validators.expectUndefined(() => defaultValue),
      validators.expectNumber((value: number) => {
        return Math.abs(value);
      }),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
};
