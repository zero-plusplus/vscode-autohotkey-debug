import { AttributeCheckerFactory, AttributeValidator } from '../../../types/dap/config';

export const attributeName = 'name';
export const defaultValue = 'AutoHotkey Debug';
export const validateNameAttribute: AttributeValidator = async(createChecker: AttributeCheckerFactory): Promise<void> => {
  const checker = createChecker(attributeName);

  const rawName = checker.get();
  if (rawName === undefined) {
    checker.markValidated(defaultValue);
    return Promise.resolve();
  }
  if (typeof rawName === 'string') {
    checker.markValidated(rawName);
    return Promise.resolve();
  }

  checker.throwTypeError('string');
  return Promise.resolve();
};
