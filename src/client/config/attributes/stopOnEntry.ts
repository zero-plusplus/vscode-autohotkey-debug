import { AttributeCheckerFactory, AttributeValidator } from '../../../types/dap/config';

export const attributeName = 'stopOnEntry';
export const defaultValue = false;
export const validate: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);

  const rawName = checker.get();
  if (rawName === undefined) {
    checker.markValidated(defaultValue);
    return Promise.resolve();
  }
  if (typeof rawName !== 'boolean') {
    checker.throwTypeError('boolean');
    return Promise.resolve();
  }

  checker.markValidated(rawName);
  return Promise.resolve();
};
