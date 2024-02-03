import { AttributeCheckerFactory, AttributeValidator } from '../../../types/dap/config';

export const attributeName = 'args';
export const defaultValue: string[] = [];
export const validate: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);

  const rawArgs = checker.get();
  if (rawArgs === undefined) {
    checker.markValidated(defaultValue);
    return Promise.resolve();
  }
  if (!Array.isArray(rawArgs)) {
    checker.throwTypeError('string[]');
    return Promise.resolve();
  }

  const containsNotStringArgs = rawArgs.some((arg) => typeof arg !== 'string');
  if (containsNotStringArgs) {
    const args = rawArgs.filter((arg) => typeof arg === 'string');
    checker.markValidated(args);
    checker.warning(`The ${attributeName} must be an array of strings. Non-string elements are ignored.`);
    return Promise.resolve();
  }

  checker.markValidated(rawArgs);
  return Promise.resolve();
};
