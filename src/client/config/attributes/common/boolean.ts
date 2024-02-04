import { AttributeValidator, DebugConfig } from '../../../../types/dap/config';

export const createBooleanValueValidator = <N extends keyof DebugConfig>(attributeName: N, defaultValue: DebugConfig[N]): AttributeValidator => {
  return async(createChecker) => {
    const checker = createChecker(attributeName);

    const rawAttribute = checker.get();
    if (rawAttribute === undefined) {
      checker.markValidated(defaultValue);
      return Promise.resolve();
    }
    if (typeof rawAttribute === 'boolean') {
      checker.markValidated(rawAttribute);
      return Promise.resolve();
    }

    checker.throwTypeError('boolean');
    return Promise.resolve();
  };
};
