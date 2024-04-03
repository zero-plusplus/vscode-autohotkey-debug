import { AttributeValidator } from '../../../types/dap/config.types';

export const attributeName = 'hostname';
export const defaultValue = '127.0.0.1';
export const validator: AttributeValidator = async(createChecker) => {
  const checker = createChecker(attributeName);

  const rawAttribute = checker.get();
  if (rawAttribute === undefined) {
    checker.markValidated(defaultValue);
    return Promise.resolve();
  }
  if (typeof rawAttribute === 'string') {
    if (rawAttribute === 'localhost') {
      checker.markValidated(defaultValue);
      return Promise.resolve();
    }
    checker.markValidated(rawAttribute);
    return Promise.resolve();
  }

  checker.throwTypeError('string');
  return Promise.resolve();
};
