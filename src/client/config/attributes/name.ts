import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig } from '../../../types/dap/config.types';

export const attributeName = 'name';
export const defaultValue: DebugConfig['name'] = 'AutoHotkey Debug';
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    predicate.isString,
    [
      validators.expectUndefined(() => defaultValue),
      validators.expectString((value: string) => value),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
};
