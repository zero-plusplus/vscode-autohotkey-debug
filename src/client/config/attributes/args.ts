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

  const args = rawArgs.filter((arg, index) => {
    if (typeof arg === 'string') {
      return true;
    }

    checker.warning(`The ${attributeName} must be an array of strings; the ${index + 1}th element of the ${attributeName} was ignored because it is not a string.`);
    return false;
  });
  checker.markValidated(args);
  return Promise.resolve();
};
