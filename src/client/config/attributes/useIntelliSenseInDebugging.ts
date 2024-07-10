import * as validators from '../../../tools/validator';
import * as predicate from '../../../tools/predicate';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig } from '../../../types/dap/config.types';

export const attributeName = 'useIntelliSenseInDebugging';
export const defaultValue: DebugConfig['useIntelliSenseInDebugging'] = false;
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    predicate.isBoolean,
    [
      validators.expectUndefined(() => defaultValue),
      validators.expectBoolean((value) => value),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
};
