import { AttributeValidator } from '../../../types/dap/config.types';

export const attributeName = 'env';
export const defaultValue = undefined;
export const validator: AttributeValidator = async(createChecker) => {
  const checker = createChecker(attributeName);

  const rawAttribute = checker.get();
  if (rawAttribute === undefined) {
    checker.markValidated(defaultValue);
    return Promise.resolve();
  }

  if (typeof rawAttribute !== 'object' || Array.isArray(rawAttribute)) {
    checker.throwTypeError('object');
    return Promise.resolve();
  }

  checker.markValidated(rawAttribute);
  return Promise.resolve();
};
