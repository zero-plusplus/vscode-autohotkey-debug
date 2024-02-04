import { AttributeValidator } from '../../../types/dap/config';

export const attributeName = 'type';
export const defaultValue = 'autohotkey';
export const validator: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);

  const rawType = checker.get();
  if (typeof rawType !== 'string') {
    checker.throwTypeError(defaultValue);
    return Promise.resolve();
  }

  if (rawType === defaultValue) {
    checker.markValidated(rawType);
    return Promise.resolve();
  }

  checker.markValidated(defaultValue);
  checker.warning(`The ${attributeName} attribute must be "${defaultValue}".`);
  return Promise.resolve();
};
