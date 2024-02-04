import { AttributeValidator, DebugConfig } from '../../../../types/dap/config';

export const createStringValueValidator = <N extends keyof DebugConfig>(attributeName: N, defaultValue: DebugConfig[N]): AttributeValidator => {
  return async(createChecker) => {
    const checker = createChecker(attributeName);

    const rawAttribute = checker.get();
    if (rawAttribute === undefined) {
      checker.markValidated(defaultValue);
      return Promise.resolve();
    }
    if (typeof rawAttribute === 'string') {
      checker.markValidated(rawAttribute);
      return Promise.resolve();
    }

    checker.throwTypeError('string');
    return Promise.resolve();
  };
};
