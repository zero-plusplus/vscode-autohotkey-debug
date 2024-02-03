import { AttributeCheckerFactory, AttributeValidator } from '../../../types/dap/config';

export const attributeName = 'skipFunctions';
export const defaultValue = undefined;
export const validate: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);

  const rawSkipFunctions = checker.get();
  if (rawSkipFunctions === undefined) {
    checker.markValidated(defaultValue);
    return Promise.resolve();
  }
  if (!Array.isArray(rawSkipFunctions)) {
    checker.throwTypeError('string[]');
    return Promise.resolve();
  }

  const skipFunctions = rawSkipFunctions.filter((skipFunction, index) => {
    if (typeof skipFunction === 'string') {
      return true;
    }

    checker.warning(`The ${attributeName} must be an array of strings; the ${index + 1}th element of the ${attributeName} was ignored because it is not a string.`);
    return false;
  });
  checker.markValidated(skipFunctions);
  return Promise.resolve();
};
