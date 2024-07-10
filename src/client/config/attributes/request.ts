import * as validators from '../../../tools/validator';
import { AttributeCheckerFactory, AttributeValidator, DebugConfig, DebugRequest } from '../../../types/dap/config.types';

export const attributeName = 'request';
export const defaultValue: DebugConfig['request'] = 'launch';
export const validator: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);
  const validate = validators.createValidator(
    (value: any): value is DebugRequest => value === 'launch' || value === 'attach',
    [
      validators.expectUndefined(() => defaultValue),
      validators.expectString((value: string) => value as DebugRequest),
    ],
  );

  const rawAttribute = checker.get();
  const validated = await validate(rawAttribute);
  checker.markValidated(validated);
};
