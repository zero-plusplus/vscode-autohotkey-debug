import { AttributeValidator } from '../../../types/dap/config';

export const attributeName = 'request';
export const defaultValue = 'launch';
export const validator: AttributeValidator = async(createChecker): Promise<void> => {
  const checker = createChecker(attributeName);

  const rawRequest = checker.get();
  if (rawRequest === undefined) {
    checker.markValidated(defaultValue);
    return Promise.resolve();
  }
  if (typeof rawRequest !== 'string') {
    checker.throwTypeError('string');
    return Promise.resolve();
  }

  switch (rawRequest) {
    case 'launch':
    case 'attach': {
      checker.markValidated(rawRequest);
      return Promise.resolve();
    }
    default: break;
  }

  checker.throwValueError([ 'launch', 'attach' ]);
  return Promise.resolve();
};
