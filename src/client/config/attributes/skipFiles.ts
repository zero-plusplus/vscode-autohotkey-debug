import { AttributeCheckerFactory, AttributeValidator } from '../../../types/dap/config';

export const attributeName = 'skipFiles';
export const defaultValue = undefined;
export const validate: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);

  const rawSkipFiles = checker.get();
  if (rawSkipFiles === undefined) {
    checker.markValidated(defaultValue);
    return Promise.resolve();
  }
  if (!Array.isArray(rawSkipFiles)) {
    checker.throwTypeError('string[]');
    return Promise.resolve();
  }

  const skipFiles = rawSkipFiles.filter((skipFile, index) => {
    if (typeof skipFile === 'string') {
      return true;
    }

    checker.warning(`The ${attributeName} must be an array of strings; the ${index + 1}th element of the ${attributeName} was ignored because it is not a string.`);
    return false;
  });
  checker.markValidated(skipFiles);
  return Promise.resolve();
};
