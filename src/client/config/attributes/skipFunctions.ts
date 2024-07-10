import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig } from '../../../types/dap/config.types';

export const attributeName = 'skipFunctions';
export const defaultValue: DebugConfig['skipFunctions'] = undefined;
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    (value: any) => predicate.isUndefined(value) || predicate.isString(value),
    [
      validators.expectUndefined((value) => value),
      validators.expectStringArray((value) => value),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
};
