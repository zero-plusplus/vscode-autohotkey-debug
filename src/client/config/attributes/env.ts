import { AttributeValidator } from '../../../types/dap/config';

export const attributeName = 'env';
export const defaultValue = undefined;
export const validate: AttributeValidator = async(createChecker) => {
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
