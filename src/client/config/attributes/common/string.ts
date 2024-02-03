import { AttributeValidator, DebugConfig } from '../../../../types/dap/config';

export const createStringValueValidator = <N extends keyof DebugConfig>(attributeName: N, defaultValue: DebugConfig[N]): AttributeValidator => {
  return async(createChecker) => {
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
};
