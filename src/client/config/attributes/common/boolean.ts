import { AttributeValidator, DebugConfig } from '../../../../types/dap/config';

export const createBooleanValueValidator = <N extends keyof DebugConfig>(attributeName: N, defaultValue: DebugConfig[N]): AttributeValidator => {
  return async(createChecker) => {
    const checker = createChecker(attributeName);

    const rawName = checker.get();
    if (rawName === undefined) {
      checker.markValidated(defaultValue);
      return Promise.resolve();
    }
    if (typeof rawName === 'boolean') {
      checker.markValidated(rawName);
      return Promise.resolve();
    }

    const value = Boolean(rawName) as DebugConfig[N];
    checker.markValidated(value);
    checker.warning(`The given value has been converted to ${value ? 'true' : 'false'}.`);
    return Promise.resolve();
  };
};
