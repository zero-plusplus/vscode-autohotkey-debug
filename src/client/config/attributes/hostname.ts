import { AttributeCheckerFactory, AttributeValidator, DebugConfig } from '../../../types/dap/config.types';
import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';

export const attributeName = 'hostname';
export const defaultValue: DebugConfig['hostname'] = '127.0.0.1';
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    predicate.isString,
    [
      validators.expectUndefined(() => defaultValue),
      validators.expectString((value: string) => {
        return value === 'localhost' ? defaultValue : value;
      }),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
};
